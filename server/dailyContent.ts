// Daily content (letters / "about me" questions) + question answers.
//
// Extends the existing MessageOverride collection: every day now has a
// `contentType` — 'letter' (the classic daily letter) or 'question' (a
// "men turaly suraq" card the partner answers after the daily game).
// Documents written before this feature have no `contentType` field and are
// treated as letters, so nothing about the first 62 days changes.
//
// Question answers live in their own collection, deduped by
// (userId, dayNumber, questionId) so a retry or an offline-queue flush can
// never create a duplicate answer for the same question.
//
// Auth model matches the rest of the app (see auth.ts): req.auth.email is
// the caller, admin-only routes are guarded by an explicit role check here
// so the admin gate never depends on the caller's kindness.

import { randomUUID } from 'crypto';
import type { Express, Request, Response } from 'express';
import mongoose from 'mongoose';

export type DailyContentType = 'letter' | 'question';
export type QuestionCategory = 'favorites' | 'memory' | 'relationship' | 'future' | 'fun';

const QUESTION_CATEGORIES: QuestionCategory[] = ['favorites', 'memory', 'relationship', 'future', 'fun'];
const MAX_ANSWER_LENGTH = 1000;

export interface IDailyContentDoc {
  dayNumber: number;
  contentType: DailyContentType;
  // letter
  title?: string;
  text?: string;
  hint?: string;
  voiceUrl?: string;
  // question
  questionId?: string;
  question?: string;
  questionHint?: string;
  questionCategory?: QuestionCategory;
}

const DailyContentSchema = new mongoose.Schema<IDailyContentDoc>({
  dayNumber: { type: Number, required: true, unique: true },
  contentType: { type: String, enum: ['letter', 'question'], default: 'letter' },
  title: { type: String },
  text: { type: String },
  hint: { type: String },
  voiceUrl: { type: String },
  questionId: { type: String },
  question: { type: String },
  questionHint: { type: String },
  questionCategory: { type: String },
});

// Same collection as the old MessageOverride — no migration needed.
export const DailyContentModel =
  (mongoose.models.MessageOverride as mongoose.Model<IDailyContentDoc>) ||
  mongoose.model<IDailyContentDoc>('MessageOverride', DailyContentSchema);

export interface IDailyQuestionAnswer {
  id: string;
  userId: string;
  userName: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  questionId: string;
  question: string; // stored snapshot — survives later question edits
  answer: string;
  createdAt: number;
  updatedAt: number;
}

const DailyQuestionAnswerSchema = new mongoose.Schema<IDailyQuestionAnswer>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, default: '' },
  dayNumber: { type: Number, required: true },
  date: { type: String, default: '' },
  questionId: { type: String, required: true },
  question: { type: String, default: '' },
  answer: { type: String, required: true },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
});
DailyQuestionAnswerSchema.index(
  { userId: 1, dayNumber: 1, questionId: 1 },
  { unique: true }
);

export const DailyQuestionAnswerModel =
  (mongoose.models.DailyQuestionAnswer as mongoose.Model<IDailyQuestionAnswer>) ||
  mongoose.model<IDailyQuestionAnswer>('DailyQuestionAnswer', DailyQuestionAnswerSchema);

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ------------------------------------------------------------------ routes

export interface DailyContentDeps {
  // How far ahead the partner may see content (letters + questions never
  // leave the server earlier than this). Admin bypasses it entirely.
  partnerMaxDay: (email: string) => Promise<number>;
  connect: () => Promise<void>;
  notifyAdmin: (text: string) => Promise<void>;
}

async function displayName(req: Request): Promise<string> {
  const email = req.auth?.email || '';
  return (email.split('@')[0] || 'user').slice(0, 40);
}

export function registerDailyContentRoutes(app: Express, deps: DailyContentDeps): void {
  const ensureDb = async (res: Response): Promise<boolean> => {
    if (mongoose.connection.readyState !== 1) await deps.connect();
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Дерекқорға қосыла алмадым.' });
      return false;
    }
    return true;
  };

  // Builds the response for one day: server override when present,
  // otherwise a bare 'letter' marker the client fills from its built-ins.
  // Questions are NEVER leaked to the partner ahead of the allow-list.
  const buildContentResponse = async (
    doc: IDailyContentDoc | null,
    dayNumber: number,
    isAdmin: boolean,
    email: string
  ): Promise<Record<string, unknown>> => {
    const type = (doc?.contentType as DailyContentType) ?? 'letter';
    if (type === 'question' && doc) {
      if (!isAdmin) {
        const maxDay = await deps.partnerMaxDay(email);
        if (dayNumber > maxDay) return { dayNumber, contentType: 'letter' };
      }
      return {
        dayNumber,
        contentType: 'question',
        questionId: doc.questionId || `day-${dayNumber}-question`,
        question: doc.question || '',
        questionHint: doc.questionHint || '',
        questionCategory: doc.questionCategory || 'relationship',
      };
    }
    // Letter: only include server fields when a real override exists — the
    // client merges them over its built-in letter.
    if (doc) return { dayNumber, contentType: 'letter', title: doc.title, text: doc.text, hint: doc.hint, voiceUrl: doc.voiceUrl };
    return { dayNumber, contentType: 'letter' };
  };

  // GET /api/daily-content/:dayNumber — what opens after today's game.
  app.get('/api/daily-content/:dayNumber', async (req: Request, res: Response) => {
    const dayNumber = parseInt(req.params.dayNumber, 10);
    if (!dayNumber || dayNumber < 1) return res.status(400).json({ error: 'Күн нөмірі дұрыс емес.' });
    if (!(await ensureDb(res))) return;
    try {
      const isAdmin = req.auth?.role === 'admin';
      const email = req.auth?.email || '';
      const doc = await DailyContentModel.findOne({ dayNumber }).lean();
      const content = await buildContentResponse(doc, dayNumber, isAdmin, email);
      return res.json({ content });
    } catch (err) {
      console.error('Daily content read error:', err);
      return res.status(500).json({ error: 'Күннің контентін оқу мүмкін болмады.' });
    }
  });

  // --- Question answers (partner side) --------------------------------------

  // POST /api/daily-question/answer — save (or update) today's answer.
  // Idempotent under (userId, dayNumber, questionId): a retry never writes
  // a duplicate, it updates the existing row instead.
  app.post('/api/daily-question/answer', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    if (!(await ensureDb(res))) return;
    try {
      const dayNumber = Number(req.body?.dayNumber);
      if (!Number.isInteger(dayNumber) || dayNumber < 1) {
        return res.status(400).json({ error: 'Күн нөмірі дұрыс емес.' });
      }
      const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : '';
      if (!answer) return res.status(400).json({ error: 'Жауап бос болмауы керек.' });
      if (answer.length > MAX_ANSWER_LENGTH) {
        return res.status(400).json({ error: `Жауап ${MAX_ANSWER_LENGTH} символдан аспауы керек.` });
      }

      // The day must really have a question assigned, and the client's
      // questionId (when given) must match — question text always comes
      // from the server, never from the request.
      //
      // Built-in question days (constants.ts entries with a `question` field,
      // e.g. day 69/70) have NO server document when the admin hasn't touched
      // that day — but the client still shows the question and POSTs here.
      // Before this branch the save was rejected ("Бұл күнге сұрақ
      // тағайындалмаған"), so the partner could never submit an answer.
      // Now: when no server doc exists yet, adopt the client's snapshot and
      // create the document lazily — one question of record per day.
      const clientQuestionId = str(req.body?.questionId, 80);
      const fallbackQuestionId = `day-${dayNumber}-question`;
      const doc = await DailyContentModel.findOne({ dayNumber }).lean();

      let questionId: string;
      let questionText: string;
      let questionHintText: string;
      let questionCategoryText: QuestionCategory;

      if (doc && (doc.contentType as DailyContentType) === 'question') {
        questionId = doc.questionId || fallbackQuestionId;
        questionText = doc.question || '';
        questionHintText = doc.questionHint || '';
        questionCategoryText = QUESTION_CATEGORIES.includes(doc.questionCategory as QuestionCategory)
          ? (doc.questionCategory as QuestionCategory)
          : 'relationship';
        if (clientQuestionId && clientQuestionId !== questionId) {
          return res.status(400).json({ error: 'Сұрақ идентификаторы дұрыс емес.' });
        }
      } else {
        // No document at all → only trust a full client snapshot for an
        // auto-assigned built-in id; a custom questionId asks for a day the
        // server doesn't know (and a letter day is simply never a question).
        if (clientQuestionId && clientQuestionId !== fallbackQuestionId) {
          return res.status(400).json({ error: 'Сұрақ идентификаторы дұрыс емес.' });
        }
        questionText = str(req.body?.question, 1000);
        if (!questionText) {
          return res.status(400).json({ error: 'Бұл күнге сұрақ тағайындалмаған.' });
        }
        questionId = fallbackQuestionId;
        questionHintText = str(req.body?.questionHint, 300);
        const catRaw = str(req.body?.questionCategory, 20) as QuestionCategory;
        questionCategoryText = QUESTION_CATEGORIES.includes(catRaw) ? catRaw : 'relationship';
        // Never overwrite an existing (letter) day — this upsert only runs
        // when `doc` was absent, so it inserts a fresh row or repairs a row
        // that lost its fields.
        await DailyContentModel.updateOne(
          { dayNumber },
          {
            $set: {
              contentType: 'question',
              questionId,
              question: questionText,
              questionHint: questionHintText,
              questionCategory: questionCategoryText,
            },
            $setOnInsert: { dayNumber },
          },
          { upsert: true }
        );
      }

      const userId = req.auth.email;
      const userName = await displayName(req);
      const now = Date.now();
      const written = await DailyQuestionAnswerModel.findOneAndUpdate(
        { userId, dayNumber, questionId },
        {
          $set: {
            answer,
            userName,
            date: str(req.body?.date, 10),
            question: questionText,
            questionHint: questionHintText,
            questionCategory: questionCategoryText,
            updatedAt: now,
          },
          $setOnInsert: {
            id: randomUUID(),
            createdAt: now,
          },
        },
        { upsert: true, new: true }
      ).lean();

      deps
        .notifyAdmin(`💌 ${userName} ${dayNumber}-күннің сұрағына жауап берд.`)
        .catch(() => undefined);

      // Never log the full answer text.
      console.log(`Daily question answer saved: user=${userId}, day=${dayNumber}, len=${answer.length}`);
      return res.json({ success: true, answer: written, updatedAt: written?.updatedAt ?? now });
    } catch (err) {
      console.error('Question answer save error:', err);
      return res.status(500).json({ error: 'Жауапты сақтау мүмкін болмады.' });
    }
  });

  // GET /api/daily-question/mine — only the caller's own answers, ever.
  app.get('/api/daily-question/mine', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    if (!(await ensureDb(res))) return;
    try {
      const answers = await DailyQuestionAnswerModel.find({ userId: req.auth.email })
        .sort({ dayNumber: -1 })
        .limit(200)
        .lean();
      return res.json({ answers });
    } catch (err) {
      console.error('My answers read error:', err);
      return res.status(500).json({ error: 'Жауаптарды оқу мүмкін болмады.' });
    }
  });

  // GET /api/daily-question/day/:dayNumber — has THIS user answered THAT day.
  app.get('/api/daily-question/day/:dayNumber', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    const dayNumber = parseInt(req.params.dayNumber, 10);
    if (!dayNumber || dayNumber < 1) return res.status(400).json({ error: 'Күн нөмірі дұрыс емес.' });
    if (!(await ensureDb(res))) return;
    try {
      const answer = await DailyQuestionAnswerModel.findOne({ userId: req.auth.email, dayNumber }).lean();
      return res.json({ answer: answer || null });
    } catch (err) {
      console.error('Day answer read error:', err);
      return res.status(500).json({ error: 'Жауапты оқу мүмкін болмады.' });
    }
  });

  // --- Admin: all question answers -------------------------------------------

  app.get('/api/admin/daily-question-answers', async (req: Request, res: Response) => {
    if (req.auth?.role !== 'admin') return res.status(403).json({ error: 'Тек әкімшіге қолжетімді.' });
    if (!(await ensureDb(res))) return;
    try {
      const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
      const limitRaw = Math.floor(Number(req.query.limit)) || 50;
      const limit = Math.min(200, Math.max(1, limitRaw));
      const filter: Record<string, unknown> = {};
      const dayQuery = Math.floor(Number(req.query.dayNumber));
      if (Number.isInteger(dayQuery) && dayQuery >= 1) filter.dayNumber = dayQuery;
      const userQuery = str(req.query.userId, 80);
      if (userQuery) filter.userId = userQuery;
      const questionQuery = str(req.query.questionId, 80);
      if (questionQuery) filter.questionId = questionQuery;

      const [answers, total] = await Promise.all([
        DailyQuestionAnswerModel.find(filter)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        DailyQuestionAnswerModel.countDocuments(filter),
      ]);
      return res.json({ answers, total, page, limit });
    } catch (err) {
      console.error('Admin answers read error:', err);
      return res.status(500).json({ error: 'Жауаптарды оқу мүмкін болмады.' });
    }
  });

  // DELETE /api/admin/daily-question-answers/:id — explicit, id-confirmed
  // removal (the UI asks for confirmation first).
  app.delete('/api/admin/daily-question-answers/:id', async (req: Request, res: Response) => {
    if (req.auth?.role !== 'admin') return res.status(403).json({ error: 'Тек әкімшіге қолжетімді.' });
    if (!(await ensureDb(res))) return;
    try {
      const result = await DailyQuestionAnswerModel.deleteOne({ id: req.params.id });
      if (!result.deletedCount) return res.status(404).json({ error: 'Жауап табылмады.' });
      return res.json({ success: true });
    } catch (err) {
      console.error('Admin answer delete error:', err);
      return res.status(500).json({ error: 'Жауапты жою мүмкін болмады.' });
    }
  });
}
