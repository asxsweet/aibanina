// Server routes for the "extras": joint streak, date-bound special stars,
// meeting countdown, wishes (paid with stardust) and game records.
//
// Auth is enforced by authGate (see auth.ts) before any of these run:
// everything needs a valid token, and everything under /api/admin needs the
// admin role.

import { randomUUID } from 'crypto';
import type { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import { APP_TIMEZONE, getDateStringInTimezone, dayIndex, addDaysStr, isValidDateStr } from './time';
import { getDisplayName } from './auth';

export interface FeatureDeps {
  connect: () => Promise<void>;
  // Sends a Telegram message to the admin (no-op when not configured).
  notifyAdmin: (text: string) => Promise<void>;
}

const GAME_IDS = ['catch', 'memory', 'reaction', 'star-race', 'love-tower', 'match3'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MAX_WISHES_PER_DAY = 5;

// ----------------------------------------------------------------- models

interface IJointDay {
  date: string;
  partner: boolean;
  admin: boolean;
}
const JointDaySchema = new mongoose.Schema<IJointDay>({
  date: { type: String, required: true, unique: true },
  partner: { type: Boolean, default: false },
  admin: { type: Boolean, default: false },
});
const JointDayModel =
  (mongoose.models.JointDay as mongoose.Model<IJointDay>) || mongoose.model<IJointDay>('JointDay', JointDaySchema);

interface ISpecialDay {
  id: string;
  month: number;
  day: number;
  year: number | null;
  title: string;
  text: string;
  hint: string;
  emoji: string;
  enabled: boolean;
  createdAt: number;
}
const SpecialDaySchema = new mongoose.Schema<ISpecialDay>({
  id: { type: String, required: true, unique: true },
  month: { type: Number, required: true },
  day: { type: Number, required: true },
  year: { type: Number, default: null },
  title: { type: String, required: true },
  text: { type: String, default: '' },
  hint: { type: String, default: '' },
  emoji: { type: String, default: '🎉' },
  enabled: { type: Boolean, default: true },
  createdAt: { type: Number, default: () => Date.now() },
});
const SpecialDayModel =
  (mongoose.models.SpecialDay as mongoose.Model<ISpecialDay>) ||
  mongoose.model<ISpecialDay>('SpecialDay', SpecialDaySchema);

interface ISiteSetting {
  key: string;
  value: Record<string, unknown>;
}
const SiteSettingSchema = new mongoose.Schema<ISiteSetting>({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} },
});
const SiteSettingModel =
  (mongoose.models.SiteSetting as mongoose.Model<ISiteSetting>) ||
  mongoose.model<ISiteSetting>('SiteSetting', SiteSettingSchema);

interface IWish {
  id: string;
  userId: string;
  name: string;
  text: string;
  cost: number;
  status: 'new' | 'done';
  createdAt: number;
  doneAt: number | null;
}
const WishSchema = new mongoose.Schema<IWish>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  name: { type: String, default: '' },
  text: { type: String, required: true },
  cost: { type: Number, default: 0 },
  status: { type: String, enum: ['new', 'done'], default: 'new' },
  createdAt: { type: Number, default: () => Date.now() },
  doneAt: { type: Number, default: null },
});
const WishModel = (mongoose.models.Wish as mongoose.Model<IWish>) || mongoose.model<IWish>('Wish', WishSchema);

interface IScore {
  userId: string;
  name: string;
  gameId: string;
  difficulty: string;
  bestMs: number;
  bestValue: number;
  metric: 'time' | 'score';
  plays: number;
  updatedAt: number;
}
const ScoreSchema = new mongoose.Schema<IScore>({
  userId: { type: String, required: true },
  name: { type: String, default: '' },
  gameId: { type: String, required: true },
  difficulty: { type: String, required: true },
  bestMs: { type: Number, default: 0 },
  bestValue: { type: Number, default: 0 },
  metric: { type: String, enum: ['time', 'score'], default: 'time' },
  plays: { type: Number, default: 1 },
  updatedAt: { type: Number, default: () => Date.now() },
});
ScoreSchema.index({ userId: 1, gameId: 1, difficulty: 1 }, { unique: true });
const ScoreModel = (mongoose.models.Score as mongoose.Model<IScore>) || mongoose.model<IScore>('Score', ScoreSchema);

// ----------------------------------------------------------------- helpers

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function validMonthDay(month: unknown, day: unknown): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  const m = month as number;
  const d = day as number;
  if (m < 1 || m > 12 || d < 1) return false;
  // 2024 is a leap year, so 29 Feb is accepted.
  return d <= new Date(Date.UTC(2024, m, 0)).getUTCDate();
}

// The client sends its own local calendar day. Trust it only when it is within
// one day of the server's "today" (covers a different timezone); otherwise use
// the server's.
export function resolveClientDate(clientDate: unknown): string {
  const serverToday = getDateStringInTimezone(APP_TIMEZONE);
  if (!isValidDateStr(clientDate)) return serverToday;
  return Math.abs(dayIndex(clientDate) - dayIndex(serverToday)) <= 1 ? clientDate : serverToday;
}

// Consecutive days (ending today, or yesterday if today isn't finished yet)
// on which BOTH of them showed up, plus the longest such run ever.
export function computeJointStreak(bothDays: string[], today: string): { streak: number; best: number } {
  const set = new Set(bothDays);
  let cursor = set.has(today) ? today : addDaysStr(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysStr(cursor, -1);
  }

  const sorted = Array.from(set).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && dayIndex(d) - dayIndex(prev) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return { streak, best };
}

const DEFAULT_SPECIAL_DAYS: Omit<ISpecialDay, 'id' | 'createdAt'>[] = [
  {
    month: 1, day: 1, year: null, emoji: '🎄', enabled: true,
    title: 'Жаңа жыл құтты болсын!',
    text: 'Жаңа жыл — жаңа жұлдыздар. Биыл да бірге өсіп, бірге жарқырайық. Сені жақсы көремін.',
    hint: 'Тілек тіле — орындалады ✨',
  },
  {
    month: 2, day: 14, year: null, emoji: '💘', enabled: true,
    title: 'Ғашықтар күні',
    text: 'Бүгін бүкіл әлем махаббатты тойлап жатыр, ал менің махаббатым — сенсің. Алыс болсақ та, жүрегім сенің қасыңда.',
    hint: 'Бүгін ерекше күн 💌',
  },
  {
    month: 3, day: 8, year: null, emoji: '🌷', enabled: true,
    title: '8 наурыз құтты болсын!',
    text: 'Ең әдемі, ең ақылды, ең ерекше әйелдердің бірі — сен. Мерекең құтты болсын, жаным.',
    hint: 'Гүл жібере алмасам да, жүрегімді жібердім 🌸',
  },
  {
    month: 3, day: 22, year: null, emoji: '🌱', enabled: true,
    title: 'Наурыз мейрамы құтты болсын!',
    text: 'Жаңа көктем, жаңа үміт, жаңа жұлдыздар. Наурыз мейрамың құтты болсын! Көктем сенімен бірге келеді.',
    hint: 'Ақ мол болсын! 🌿',
  },
  {
    month: 12, day: 31, year: null, emoji: '🎆', enabled: true,
    title: 'Жылдың соңғы күні',
    text: 'Осы жылы сенімен бірге жұлдыз қатарын жинадық. Келесі жылы да бірге болайық.',
    hint: 'Жаңа жылда кездескенше 🥂',
  },
];

// ------------------------------------------------------------------ routes

export function registerFeatureRoutes(app: Express, deps: FeatureDeps): void {
  const ensureDb = async (res: Response): Promise<boolean> => {
    if (mongoose.connection.readyState !== 1) await deps.connect();
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Дерекқорға қосыла алмадым.' });
      return false;
    }
    return true;
  };

  const jointState = async (today: string) => {
    const [both, todayDoc] = await Promise.all([
      JointDayModel.find({ partner: true, admin: true }).select('date').lean(),
      JointDayModel.findOne({ date: today }).lean(),
    ]);
    const { streak, best } = computeJointStreak(both.map((d) => d.date), today);
    return {
      todayDate: today,
      today: { partner: !!todayDoc?.partner, admin: !!todayDoc?.admin },
      streak,
      best,
    };
  };

  // --- Joint streak ---------------------------------------------------------
  app.get('/api/joint', async (req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      return res.json(await jointState(resolveClientDate(req.query.date)));
    } catch (err) {
      console.error('Joint streak read error:', err);
      return res.status(500).json({ error: 'Ортақ стрикті оқу мүмкін болмады.' });
    }
  });

  // Both players "check in" once per day: the partner automatically when she
  // claims her star, the admin with a button on his dashboard.
  app.post('/api/joint/checkin', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    if (!(await ensureDb(res))) return;
    try {
      const date = resolveClientDate(req.body?.date);
      const field = req.auth.role === 'admin' ? 'admin' : 'partner';
      const before = await JointDayModel.findOne({ date }).lean();
      await JointDayModel.updateOne({ date }, { $set: { [field]: true } }, { upsert: true });

      if (field === 'partner' && !before?.partner) {
        const streak = Number.isInteger(req.body?.streak) ? Math.max(0, Number(req.body.streak)) : 0;
        const name = await getDisplayName(req.auth);
        deps
          .notifyAdmin(`🌟 ${name} бүгінгі жұлдызын алды${streak > 0 ? ` (стрик: ${streak} 🔥)` : ''}.`)
          .catch(() => undefined);
      }
      return res.json(await jointState(date));
    } catch (err) {
      console.error('Joint check-in error:', err);
      return res.status(500).json({ error: 'Белгілеу мүмкін болмады.' });
    }
  });

  // --- Special (date-bound) stars ------------------------------------------
  // Partner: only what belongs to TODAY — future surprises never leave the server.
  app.get('/api/special-days/today', async (req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      const date = resolveClientDate(req.query.date);
      const [y, m, d] = date.split('-').map(Number);
      const docs = await SpecialDayModel.find({ month: m, day: d, enabled: true }).lean();
      const items = docs
        .filter((s) => s.year === null || s.year === undefined || s.year === y)
        .map((s) => ({ id: s.id, title: s.title, text: s.text, hint: s.hint, emoji: s.emoji }));
      return res.json({ date, items });
    } catch (err) {
      console.error('Special days read error:', err);
      return res.status(500).json({ error: 'Ерекше күндерді оқу мүмкін болмады.' });
    }
  });

  app.get('/api/admin/special-days', async (_req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      const docs = await SpecialDayModel.find({}).lean();
      docs.sort((a, b) => a.month - b.month || a.day - b.day);
      return res.json({ specialDays: docs });
    } catch (err) {
      console.error('Special days admin read error:', err);
      return res.status(500).json({ error: 'Оқу мүмкін болмады.' });
    }
  });

  // Returns either { error } (invalid input) or { value } (clean, length-limited data).
  const parseSpecialDay = (
    body: Record<string, unknown>
  ): { value?: Omit<ISpecialDay, 'id' | 'createdAt'>; error?: string } => {
    const month = Number(body.month);
    const day = Number(body.day);
    if (!validMonthDay(month, day)) return { error: 'Күн мен айды дұрыс көрсет.' };
    const yearRaw = body.year;
    let year: number | null = null;
    if (yearRaw !== null && yearRaw !== undefined && yearRaw !== '') {
      year = Number(yearRaw);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'Жылды дұрыс көрсет.' };
    }
    const title = str(body.title, 80);
    if (!title) return { error: 'Тақырып бос болмауы керек.' };
    return {
      value: {
        month,
        day,
        year,
        title,
        text: str(body.text, 2000),
        hint: str(body.hint, 300),
        emoji: str(body.emoji, 8) || '🎉',
        enabled: body.enabled !== false,
      },
    };
  };

  app.post('/api/admin/special-days', async (req: Request, res: Response) => {
    const parsed = parseSpecialDay(req.body || {});
    if (!parsed.value) return res.status(400).json({ error: parsed.error });
    if (!(await ensureDb(res))) return;
    try {
      const doc = await SpecialDayModel.create({ id: randomUUID(), ...parsed.value, createdAt: Date.now() });
      return res.json({ specialDay: doc });
    } catch (err) {
      console.error('Special day create error:', err);
      return res.status(500).json({ error: 'Сақтау мүмкін болмады.' });
    }
  });

  app.put('/api/admin/special-days/:id', async (req: Request, res: Response) => {
    const parsed = parseSpecialDay(req.body || {});
    if (!parsed.value) return res.status(400).json({ error: parsed.error });
    if (!(await ensureDb(res))) return;
    try {
      const doc = await SpecialDayModel.findOneAndUpdate({ id: req.params.id }, parsed.value, { new: true }).lean();
      if (!doc) return res.status(404).json({ error: 'Табылмады.' });
      return res.json({ specialDay: doc });
    } catch (err) {
      console.error('Special day update error:', err);
      return res.status(500).json({ error: 'Сақтау мүмкін болмады.' });
    }
  });

  app.delete('/api/admin/special-days/:id', async (req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      await SpecialDayModel.deleteOne({ id: req.params.id });
      return res.json({ success: true });
    } catch (err) {
      console.error('Special day delete error:', err);
      return res.status(500).json({ error: 'Жою мүмкін болмады.' });
    }
  });

  // One-click starter set (New Year, 14 Feb, 8 March, Nauryz, 31 Dec). Never
  // duplicates: a default is only added if no star exists on that date yet.
  app.post('/api/admin/special-days/seed-defaults', async (_req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      let added = 0;
      for (const d of DEFAULT_SPECIAL_DAYS) {
        const exists = await SpecialDayModel.exists({ month: d.month, day: d.day });
        if (exists) continue;
        await SpecialDayModel.create({ id: randomUUID(), ...d, createdAt: Date.now() });
        added += 1;
      }
      return res.json({ success: true, added });
    } catch (err) {
      console.error('Special days seed error:', err);
      return res.status(500).json({ error: 'Қосу мүмкін болмады.' });
    }
  });

  // --- Meeting countdown ----------------------------------------------------
  app.get('/api/meeting', async (_req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      const doc = await SiteSettingModel.findOne({ key: 'meeting' }).lean();
      const v = (doc?.value || {}) as { date?: string; label?: string };
      if (!v.date || !isValidDateStr(v.date)) return res.json({ meeting: null });
      return res.json({ meeting: { date: v.date, label: v.label || '' } });
    } catch (err) {
      console.error('Meeting read error:', err);
      return res.status(500).json({ error: 'Оқу мүмкін болмады.' });
    }
  });

  app.put('/api/admin/meeting', async (req: Request, res: Response) => {
    const date = req.body?.date;
    if (!isValidDateStr(date)) return res.status(400).json({ error: 'Күнді дұрыс көрсет.' });
    if (!(await ensureDb(res))) return;
    try {
      await SiteSettingModel.updateOne(
        { key: 'meeting' },
        { $set: { value: { date, label: str(req.body?.label, 60) } } },
        { upsert: true }
      );
      return res.json({ success: true });
    } catch (err) {
      console.error('Meeting save error:', err);
      return res.status(500).json({ error: 'Сақтау мүмкін болмады.' });
    }
  });

  app.delete('/api/admin/meeting', async (_req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      await SiteSettingModel.deleteOne({ key: 'meeting' });
      return res.json({ success: true });
    } catch (err) {
      console.error('Meeting delete error:', err);
      return res.status(500).json({ error: 'Жою мүмкін болмады.' });
    }
  });

  // --- Wishes (paid with stardust) -----------------------------------------
  app.post('/api/wishes', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    const text = str(req.body?.text, 300);
    if (!text) return res.status(400).json({ error: 'Тілекті жаз.' });
    if (!(await ensureDb(res))) return;
    try {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const recent = await WishModel.countDocuments({ userId: req.auth.email, createdAt: { $gte: since } });
      if (recent >= MAX_WISHES_PER_DAY) {
        return res.status(429).json({ error: 'Бүгін тым көп тілек жібердің. Ертең жалғастыр 💛' });
      }
      const name = await getDisplayName(req.auth);
      const doc = await WishModel.create({
        id: randomUUID(),
        userId: req.auth.email,
        name,
        text,
        cost: Number.isInteger(req.body?.cost) ? Math.max(0, Number(req.body.cost)) : 0,
        createdAt: Date.now(),
      });
      deps.notifyAdmin(`🎁 ${name} тілек жіберді: «${text}»`).catch(() => undefined);
      return res.json({ wish: doc });
    } catch (err) {
      console.error('Wish create error:', err);
      return res.status(500).json({ error: 'Тілекті жіберу мүмкін болмады.' });
    }
  });

  app.get('/api/wishes/mine', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    if (!(await ensureDb(res))) return;
    try {
      const wishes = await WishModel.find({ userId: req.auth.email }).sort({ createdAt: -1 }).limit(50).lean();
      return res.json({ wishes });
    } catch (err) {
      console.error('Wishes read error:', err);
      return res.status(500).json({ error: 'Оқу мүмкін болмады.' });
    }
  });

  app.get('/api/admin/wishes', async (_req: Request, res: Response) => {
    if (!(await ensureDb(res))) return;
    try {
      const wishes = await WishModel.find({}).sort({ createdAt: -1 }).limit(200).lean();
      return res.json({ wishes });
    } catch (err) {
      console.error('Wishes admin read error:', err);
      return res.status(500).json({ error: 'Оқу мүмкін болмады.' });
    }
  });

  app.patch('/api/admin/wishes/:id', async (req: Request, res: Response) => {
    const status = req.body?.status === 'done' ? 'done' : req.body?.status === 'new' ? 'new' : null;
    if (!status) return res.status(400).json({ error: 'status: new немесе done' });
    if (!(await ensureDb(res))) return;
    try {
      const doc = await WishModel.findOneAndUpdate(
        { id: req.params.id },
        { status, doneAt: status === 'done' ? Date.now() : null },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ error: 'Табылмады.' });
      return res.json({ wish: doc });
    } catch (err) {
      console.error('Wish update error:', err);
      return res.status(500).json({ error: 'Сақтау мүмкін болмады.' });
    }
  });

  // --- Game records (best time or highest score per game/difficulty/player) --
  app.post('/api/scores', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    const gameId = str(req.body?.gameId, 20);
    const difficulty = str(req.body?.difficulty, 10);
    const durationMs = Number(req.body?.durationMs);
    const scoreValue = Number(req.body?.scoreValue);
    const metric = req.body?.metric === 'score' ? 'score' : 'time';
    if (!GAME_IDS.includes(gameId) || !DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: 'Ойын немесе қиындық қате.' });
    }
    // A real win can't be faster than a second, nor slower than 10 minutes.
    const candidate = metric === 'score' ? scoreValue : durationMs;
    if (!Number.isFinite(candidate) || candidate < (metric === 'score' ? 0 : 1000) || candidate > 10000000) {
      return res.status(400).json({ error: 'Уақыт қате.' });
    }
    if (!(await ensureDb(res))) return;
    try {
      const userId = req.auth.email;
      const name = await getDisplayName(req.auth);
      const value = Math.round(candidate);
      const existing = await ScoreModel.findOne({ userId, gameId, difficulty }).lean();
      const previous = existing ? (existing.bestValue || existing.bestMs || 0) : null;
      const isRecord = previous === null || (metric === 'score' ? value > previous : value < previous);
      const bestValue = isRecord ? value : previous!;
      await ScoreModel.updateOne(
        { userId, gameId, difficulty },
        { $set: { name, metric, bestValue, bestMs: metric === 'time' ? bestValue : 0, updatedAt: Date.now() }, $inc: { plays: 1 } },
        { upsert: true }
      );
      const rivalDoc = await ScoreModel.findOne({ gameId, difficulty, userId: { $ne: userId } })
        .sort(metric === 'score' ? { bestValue: -1 } : { bestValue: 1, bestMs: 1 })
        .lean();
      return res.json({
        bestMs: metric === 'time' ? bestValue : 0,
        bestValue,
        metric,
        isRecord,
        previousBestMs: metric === 'time' ? previous : null,
        previousBestValue: previous,
        rival: rivalDoc ? { name: rivalDoc.name, bestMs: rivalDoc.bestMs, bestValue: rivalDoc.bestValue || rivalDoc.bestMs, metric: rivalDoc.metric || 'time' } : null,
      });
    } catch (err) {
      console.error('Score save error:', err);
      return res.status(500).json({ error: 'Нәтижені сақтау мүмкін болмады.' });
    }
  });

  app.get('/api/scores', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Қайта кіру керек.' });
    if (!(await ensureDb(res))) return;
    try {
      const docs = await ScoreModel.find({}).lean();
      return res.json({
        me: req.auth.email,
        scores: docs.map((s) => ({
          userId: s.userId,
          name: s.name,
          gameId: s.gameId,
          difficulty: s.difficulty,
          bestMs: s.bestMs,
          bestValue: s.bestValue || s.bestMs,
          metric: s.metric || 'time',
          plays: s.plays,
          updatedAt: s.updatedAt,
        })),
      });
    } catch (err) {
      console.error('Scores read error:', err);
      return res.status(500).json({ error: 'Оқу мүмкін болмады.' });
    }
  });
}
