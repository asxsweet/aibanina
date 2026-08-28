import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Render injects PORT automatically at runtime. 3001 is only used for local dev.
const PORT = Number(process.env.PORT) || 3001;

// 20mb covers a resized photo or a short (10-15s) compressed video upload.
app.use(express.json({ limit: '20mb' }));

// --- CORS ---------------------------------------------------------------
// Allow the deployed frontend (Vercel) plus local dev origins to call this
// API. Set CORS_ORIGIN in the Render dashboard to your Vercel URL, e.g.
// https://nashe-sozvezdie.vercel.app — comma-separate multiple origins if
// you have a preview + production URL. Falls back to "*" (any origin) if
// CORS_ORIGIN isn't set, so the app still works out of the box, but for
// production it's best to lock this down to your real frontend URL.
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

interface IUserProgress {
  userId: string;
  name: string | null;
  daysPlayed: number;
  lastPlayedDate: string | null;
  lastPlayTimestamp: number;
  streak: number;
  unlockedDays: number[];
  soundEnabled: boolean;
  theme: string;
  difficulty: string;
  updatedAt: Date;
}

// MongoDB Schema
const UserProgressSchema = new mongoose.Schema<IUserProgress>({
  userId: { type: String, required: true, unique: true },
  // The account's chosen display name, shown in the admin panel instead of
  // the raw userId (account email). Optional: older records or guests
  // without a name fall back to userId wherever this is displayed.
  name: { type: String, default: null },
  daysPlayed: { type: Number, default: 0 },
  // Calendar day (YYYY-MM-DD) in the PLAYER's local timezone. This is the
  // source of truth for streak logic — never derive it from lastPlayTimestamp
  // via toISOString(), since that reinterprets the moment in UTC and shifts
  // the calendar day by one for any timezone ahead of or behind UTC.
  lastPlayedDate: { type: String, default: null },
  lastPlayTimestamp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  unlockedDays: { type: [Number], default: [] },
  soundEnabled: { type: Boolean, default: true },
  theme: { type: String, default: 'day' },
  difficulty: { type: String, default: 'medium' },
  updatedAt: { type: Date, default: Date.now },
});

const UserProgressModel =
  (mongoose.models.UserProgress as mongoose.Model<IUserProgress>) ||
  mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);

// MongoDB connection helper
async function connectToMongo() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('ℹ️ MONGODB_URI не заполнена в .env. Сервер работает в автономном режиме с fallback.');
    return;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('✅ Успешное подключение к базе данных MongoDB!');
    }
  } catch (err) {
    console.error('❌ Ошибка подключения к MongoDB:', err);
  }
}

// --- API Routes -----------------------------------------------------------

// Root — handy for a quick "is it alive" check when opening the Render URL directly
app.get('/', (req, res) => {
  res.json({
    service: 'nashe-sozvezdie-api',
    status: 'ok',
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongoConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/progress/:userId
app.get('/api/progress/:userId', async (req, res) => {
  const { userId } = req.params;

  if (mongoose.connection.readyState !== 1) {
    await connectToMongo();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'MongoDB database not connected',
      mongoConnected: false,
    });
  }

  try {
    const doc = await UserProgressModel.findOne({ userId });
    if (!doc) {
      return res.status(404).json({ message: 'User progress not found' });
    }

    // Prefer the stored calendar-day string. Only derive from the UTC
    // timestamp as a last-resort fallback for old records saved before this
    // field existed — that derivation is timezone-lossy, so it's never used
    // once a real lastPlayedDate is on the doc.
    const lastPlayedDate = doc.lastPlayedDate
      ?? (doc.lastPlayTimestamp ? new Date(doc.lastPlayTimestamp).toISOString().split('T')[0] : null);

    return res.json({
      daysPlayed: doc.daysPlayed,
      name: doc.name ?? null,
      lastPlayedDate,
      lastPlayTimestamp: doc.lastPlayTimestamp,
      streak: doc.streak,
      unlockedDays: doc.unlockedDays,
      soundEnabled: doc.soundEnabled,
      theme: doc.theme,
      difficulty: doc.difficulty,
    });
  } catch (err) {
    console.error('Error reading progress from MongoDB:', err);
    return res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// POST /api/progress
app.post('/api/progress', async (req, res) => {
  const { userId, progress } = req.body;

  if (!userId || !progress) {
    return res.status(400).json({ error: 'userId and progress are required' });
  }

  if (mongoose.connection.readyState !== 1) {
    await connectToMongo();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'MongoDB database not connected',
      mongoConnected: false,
    });
  }

  // lastPlayedDate (YYYY-MM-DD) is the player's local calendar day and is
  // trusted as-is — it's the only value streak comparisons should ever use.
  // lastPlayTimestamp is kept only as an informational "last synced at"
  // moment; it must never be round-tripped back into a calendar day (see
  // GET /api/progress/:userId), since that conversion is timezone-lossy.
  const lastPlayedDate = progress.lastPlayedDate ?? null;
  const lastPlayTimestamp = progress.lastPlayTimestamp ?? Date.now();

  try {
    const updated = await UserProgressModel.findOneAndUpdate(
      { userId },
      {
        userId,
        name: progress.name ?? null,
        daysPlayed: progress.daysPlayed,
        lastPlayedDate,
        lastPlayTimestamp,
        streak: progress.streak,
        unlockedDays: progress.unlockedDays,
        soundEnabled: progress.soundEnabled,
        theme: progress.theme || 'day',
        difficulty: progress.difficulty || 'medium',
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, mongoConnected: true, data: updated });
  } catch (err) {
    console.error('Error saving progress to MongoDB:', err);
    return res.status(500).json({ error: 'Failed to save progress to MongoDB' });
  }
});

// --- Gallery (shared photo album) -----------------------------------------

interface IPhoto {
  id: string;
  dataUrl: string;
  mediaType: 'photo' | 'video';
  caption: string;
  uploadedBy: string;
  uploadedAt: number;
  isFavorite: boolean;
  reactions: string[];
  linkedDay: number | null;
}

const PhotoSchema = new mongoose.Schema<IPhoto>({
  id: { type: String, required: true, unique: true },
  dataUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['photo', 'video'], default: 'photo' },
  caption: { type: String, default: '' },
  uploadedBy: { type: String, default: '' },
  uploadedAt: { type: Number, default: () => Date.now() },
  isFavorite: { type: Boolean, default: false },
  reactions: { type: [String], default: [] },
  linkedDay: { type: Number, default: null },
});

const PhotoModel =
  (mongoose.models.Photo as mongoose.Model<IPhoto>) ||
  mongoose.model<IPhoto>('Photo', PhotoSchema);

// GET /api/photos — list the whole shared gallery, newest first
app.get('/api/photos', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    await connectToMongo();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB database not connected', mongoConnected: false });
  }

  try {
    const photos = await PhotoModel.find({}).sort({ uploadedAt: -1 }).lean();
    return res.json({ photos });
  } catch (err) {
    console.error('Error fetching photos:', err);
    return res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// POST /api/photos — add a new photo (or short video) to the shared gallery
app.post('/api/photos', async (req, res) => {
  const { dataUrl, caption, uploadedBy, mediaType } = req.body;

  if (!dataUrl) {
    return res.status(400).json({ error: 'dataUrl is required' });
  }

  if (mongoose.connection.readyState !== 1) {
    await connectToMongo();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB database not connected', mongoConnected: false });
  }

  try {
    const photo: IPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      dataUrl,
      mediaType: mediaType === 'video' ? 'video' : 'photo',
      caption: typeof caption === 'string' ? caption.slice(0, 300) : '',
      uploadedBy: typeof uploadedBy === 'string' ? uploadedBy.slice(0, 60) : '',
      uploadedAt: Date.now(),
      isFavorite: false,
      reactions: [],
      linkedDay: null,
    };
    await PhotoModel.create(photo);
    return res.json({ success: true, photo });
  } catch (err) {
    console.error('Error saving photo:', err);
    return res.status(500).json({ error: 'Failed to save photo' });
  }
});

// PATCH /api/photos/:id — toggle favorite, edit caption, set reactions, or link to a constellation day
app.patch('/api/photos/:id', async (req, res) => {
  const { id } = req.params;
  const { isFavorite, caption, reactions, linkedDay } = req.body;

  if (mongoose.connection.readyState !== 1) {
    await connectToMongo();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB database not connected', mongoConnected: false });
  }

  const update: Partial<IPhoto> = {};
  if (typeof isFavorite === 'boolean') update.isFavorite = isFavorite;
  if (typeof caption === 'string') update.caption = caption.slice(0, 300);
  if (Array.isArray(reactions)) update.reactions = reactions.filter((r) => typeof r === 'string').slice(0, 12);
  if (linkedDay === null || typeof linkedDay === 'number') update.linkedDay = linkedDay;

  try {
    const updated = await PhotoModel.findOneAndUpdate({ id }, update, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    return res.json({ success: true, photo: updated });
  } catch (err) {
    console.error('Error updating photo:', err);
    return res.status(500).json({ error: 'Failed to update photo' });
  }
});

// DELETE /api/photos/:id
app.delete('/api/photos/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Photo id is required' });
  }

  if (mongoose.connection.readyState !== 1) {
    await connectToMongo();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB database not connected', mongoConnected: false });
  }

  try {
    const result = await PhotoModel.deleteOne({ id });
    if (!result || result.deletedCount === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting photo:', err);
    return res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// --- Daily two-way replies --------------------------------------------------
//
// Lets the partner leave a short mood emoji and/or a few words back on any
// day's star, so the daily ritual isn't purely one-directional. Keyed by
// dayNumber only (just like message overrides) since this is a two-person app.

interface IDailyReply {
  dayNumber: number;
  mood?: string;
  text?: string;
  updatedAt: Date;
}

const DailyReplySchema = new mongoose.Schema<IDailyReply>({
  dayNumber: { type: Number, required: true, unique: true },
  mood: { type: String },
  text: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

const DailyReplyModel =
  (mongoose.models.DailyReply as mongoose.Model<IDailyReply>) ||
  mongoose.model<IDailyReply>('DailyReply', DailyReplySchema);

// GET /api/replies — every day's mood/text reply at once, for the admin
// panel (the single-day GET /api/replies/:day below stays for the reply box).
app.get('/api/replies', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const docs = await DailyReplyModel.find({}).sort({ dayNumber: 1 }).lean();
    return res.json({
      replies: docs.map((d) => ({
        dayNumber: d.dayNumber,
        mood: d.mood,
        text: d.text,
        updatedAt: d.updatedAt.getTime(),
      })),
    });
  } catch (err) {
    console.error('Error fetching all replies:', err);
    return res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// GET /api/replies/:day — fetch the reply left on a specific day, if any
app.get('/api/replies/:day', async (req, res) => {
  const dayNumber = parseInt(req.params.day, 10);
  if (!dayNumber || dayNumber < 1) {
    return res.status(400).json({ error: 'Invalid day number' });
  }
  if (!(await ensureMongo(res))) return;
  try {
    const doc = await DailyReplyModel.findOne({ dayNumber }).lean();
    if (!doc) return res.status(404).json({ message: 'No reply yet' });
    return res.json({
      reply: {
        dayNumber: doc.dayNumber,
        mood: doc.mood,
        text: doc.text,
        updatedAt: doc.updatedAt.getTime(),
      },
    });
  } catch (err) {
    console.error('Error fetching reply:', err);
    return res.status(500).json({ error: 'Failed to fetch reply' });
  }
});

// PUT /api/replies/:day — create or update the reply for a specific day
app.put('/api/replies/:day', async (req, res) => {
  const dayNumber = parseInt(req.params.day, 10);
  if (!dayNumber || dayNumber < 1) {
    return res.status(400).json({ error: 'Invalid day number' });
  }
  if (!(await ensureMongo(res))) return;

  const { mood, text } = req.body;
  const update: Partial<IDailyReply> = { updatedAt: new Date() };
  if (typeof mood === 'string') update.mood = mood.slice(0, 8);
  if (typeof text === 'string') update.text = text.slice(0, 300);

  try {
    const updated = await DailyReplyModel.findOneAndUpdate(
      { dayNumber },
      { dayNumber, ...update },
      { upsert: true, new: true }
    );
    return res.json({
      success: true,
      reply: {
        dayNumber: updated.dayNumber,
        mood: updated.mood,
        text: updated.text,
        updatedAt: updated.updatedAt.getTime(),
      },
    });
  } catch (err) {
    console.error('Error saving reply:', err);
    return res.status(500).json({ error: 'Failed to save reply' });
  }
});

// --- Time capsules (letters locked until a future date) ---------------------

interface ITimeCapsule {
  id: string;
  title: string;
  text: string;
  unlockDate: string; // YYYY-MM-DD
  createdAt: number;
}

const TimeCapsuleSchema = new mongoose.Schema<ITimeCapsule>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
  unlockDate: { type: String, required: true },
  createdAt: { type: Number, default: () => Date.now() },
});

const TimeCapsuleModel =
  (mongoose.models.TimeCapsule as mongoose.Model<ITimeCapsule>) ||
  mongoose.model<ITimeCapsule>('TimeCapsule', TimeCapsuleSchema);

// GET /api/capsules — list every capsule (frontend hides the text of locked
// ones — the API returns everything since there's no session system here,
// consistent with the rest of the app's trust model)
app.get('/api/capsules', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const capsules = await TimeCapsuleModel.find({}).sort({ unlockDate: 1 }).lean();
    return res.json({ capsules });
  } catch (err) {
    console.error('Error fetching capsules:', err);
    return res.status(500).json({ error: 'Failed to fetch capsules' });
  }
});

// POST /api/capsules — create a new locked letter
app.post('/api/capsules', async (req, res) => {
  const { title, text, unlockDate } = req.body;
  if (typeof title !== 'string' || !title.trim() || typeof text !== 'string' || !text.trim() ||
      typeof unlockDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(unlockDate)) {
    return res.status(400).json({ error: 'title, text and a valid unlockDate (YYYY-MM-DD) are required' });
  }
  if (!(await ensureMongo(res))) return;

  try {
    const id = 'capsule_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const created = await TimeCapsuleModel.create({
      id,
      title: title.trim().slice(0, 80),
      text: text.trim().slice(0, 1000),
      unlockDate,
    });
    return res.json({ success: true, capsule: created });
  } catch (err) {
    console.error('Error creating capsule:', err);
    return res.status(500).json({ error: 'Failed to create capsule' });
  }
});

// DELETE /api/capsules/:id
app.delete('/api/capsules/:id', async (req, res) => {
  const { id } = req.params;
  if (!(await ensureMongo(res))) return;
  try {
    const result = await TimeCapsuleModel.deleteOne({ id });
    if (!result || result.deletedCount === 0) {
      return res.status(404).json({ error: 'Capsule not found' });
    }
    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting capsule:', err);
    return res.status(500).json({ error: 'Failed to delete capsule' });
  }
});

// --- Shared dreams / plans checklist -----------------------------------------

interface IDreamItem {
  id: string;
  text: string;
  isDone: boolean;
  createdBy: string;
  createdAt: number;
}

const DreamItemSchema = new mongoose.Schema<IDreamItem>({
  id: { type: String, required: true, unique: true },
  text: { type: String, required: true },
  isDone: { type: Boolean, default: false },
  createdBy: { type: String, default: '' },
  createdAt: { type: Number, default: () => Date.now() },
});

const DreamItemModel =
  (mongoose.models.DreamItem as mongoose.Model<IDreamItem>) ||
  mongoose.model<IDreamItem>('DreamItem', DreamItemSchema);

// GET /api/dreams — the whole shared checklist, oldest first
app.get('/api/dreams', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const dreams = await DreamItemModel.find({}).sort({ createdAt: 1 }).lean();
    return res.json({ dreams });
  } catch (err) {
    console.error('Error fetching dreams:', err);
    return res.status(500).json({ error: 'Failed to fetch dreams' });
  }
});

// POST /api/dreams — add a new shared dream/plan
app.post('/api/dreams', async (req, res) => {
  const { text, createdBy } = req.body;
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!(await ensureMongo(res))) return;

  try {
    const id = 'dream_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const created = await DreamItemModel.create({
      id,
      text: text.trim().slice(0, 150),
      createdBy: typeof createdBy === 'string' ? createdBy.slice(0, 60) : '',
    });
    return res.json({ success: true, dream: created });
  } catch (err) {
    console.error('Error creating dream:', err);
    return res.status(500).json({ error: 'Failed to create dream' });
  }
});

// PUT /api/dreams/:id — toggle done / edit text
app.put('/api/dreams/:id', async (req, res) => {
  const { id } = req.params;
  const { isDone, text } = req.body;
  if (!(await ensureMongo(res))) return;

  const update: Partial<IDreamItem> = {};
  if (typeof isDone === 'boolean') update.isDone = isDone;
  if (typeof text === 'string' && text.trim()) update.text = text.trim().slice(0, 150);

  try {
    const updated = await DreamItemModel.findOneAndUpdate({ id }, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Dream not found' });
    return res.json({ success: true, dream: updated });
  } catch (err) {
    console.error('Error updating dream:', err);
    return res.status(500).json({ error: 'Failed to update dream' });
  }
});

// DELETE /api/dreams/:id
app.delete('/api/dreams/:id', async (req, res) => {
  const { id } = req.params;
  if (!(await ensureMongo(res))) return;
  try {
    const result = await DreamItemModel.deleteOne({ id });
    if (!result || result.deletedCount === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting dream:', err);
    return res.status(500).json({ error: 'Failed to delete dream' });
  }
});

// --- Day completion log (when each star was actually earned) ---------------
//
// UserProgress only ever stores the current snapshot, so there's no way to
// see when day 3 specifically was unlocked once day 10 has been reached.
// This append-only log fixes that: one row per (userId, dayNumber), written
// once and never overwritten, so the admin can see the real history.

interface IDayCompletionLog {
  userId: string;
  dayNumber: number;
  completedAt: number;
}

const DayCompletionLogSchema = new mongoose.Schema<IDayCompletionLog>({
  userId: { type: String, required: true },
  dayNumber: { type: Number, required: true },
  completedAt: { type: Number, required: true },
});
DayCompletionLogSchema.index({ userId: 1, dayNumber: 1 }, { unique: true });

const DayCompletionLogModel =
  (mongoose.models.DayCompletionLog as mongoose.Model<IDayCompletionLog>) ||
  mongoose.model<IDayCompletionLog>('DayCompletionLog', DayCompletionLogSchema);

// POST /api/day-log — called once, right when a new day's star is earned.
// Upserts with $setOnInsert so a retry (e.g. a flaky connection) can never
// overwrite the true original timestamp.
app.post('/api/day-log', async (req, res) => {
  const { userId, dayNumber } = req.body;
  if (typeof userId !== 'string' || !userId.trim() || typeof dayNumber !== 'number' || dayNumber < 1) {
    return res.status(400).json({ error: 'userId and dayNumber are required' });
  }
  if (!(await ensureMongo(res))) return;

  try {
    const doc = await DayCompletionLogModel.findOneAndUpdate(
      { userId, dayNumber },
      { $setOnInsert: { completedAt: Date.now() } },
      { upsert: true, new: true }
    );
    return res.json({ success: true, log: doc });
  } catch (err) {
    console.error('Error logging day completion:', err);
    return res.status(500).json({ error: 'Failed to log day completion' });
  }
});

// GET /api/admin/day-logs — every (userId, dayNumber, completedAt) row, for
// the admin panel's partner-progress view.
app.get('/api/admin/day-logs', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const logs = await DayCompletionLogModel.find({}).sort({ dayNumber: 1 }).lean();
    return res.json({ logs });
  } catch (err) {
    console.error('Error fetching day logs:', err);
    return res.status(500).json({ error: 'Failed to fetch day logs' });
  }
});

// GET /api/admin/users-progress — every registered player's current
// snapshot (day, streak, theme, last played), so the admin can see who's
// playing and how far along they are without guessing a userId.
app.get('/api/admin/users-progress', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const docs = await UserProgressModel.find({}).lean();
    const users = docs.map((doc) => ({
      userId: doc.userId,
      name: doc.name ?? null,
      daysPlayed: doc.daysPlayed,
      streak: doc.streak,
      unlockedDays: doc.unlockedDays,
      lastPlayedDate: doc.lastPlayedDate
        ?? (doc.lastPlayTimestamp ? new Date(doc.lastPlayTimestamp).toISOString().split('T')[0] : null),
      lastPlayTimestamp: doc.lastPlayTimestamp,
      theme: doc.theme,
    }));
    return res.json({ users });
  } catch (err) {
    console.error('Error fetching users progress:', err);
    return res.status(500).json({ error: 'Failed to fetch users progress' });
  }
});

// --- Admin: content & schedule overrides ----------------------------------
//
// The 30 daily messages and the game rotation live as static defaults in the
// frontend (src/data/constants.ts, src/components/GameHub.tsx). These
// override collections let the admin change what actually shows on a given
// day without touching code — an override document exists only for days
// the admin has customized; everything else keeps using the built-in
// default. This mirrors how the rest of the API works and needs no schema
// migration if the admin never touches a given day.
//
// Note on auth: like every other route in this file, these trust the
// request as-is — there's no server-side session system in this app (login
// is handled entirely client-side via localStorage), so the frontend only
// shows the admin UI to accounts with role "admin". This is consistent with
// the app's existing trust model, not a new gap.

interface IMessageOverride {
  dayNumber: number;
  title?: string;
  text?: string;
  hint?: string;
  voiceUrl?: string;
}

const MessageOverrideSchema = new mongoose.Schema<IMessageOverride>({
  dayNumber: { type: Number, required: true, unique: true },
  title: { type: String },
  text: { type: String },
  hint: { type: String },
  voiceUrl: { type: String },
});

const MessageOverrideModel =
  (mongoose.models.MessageOverride as mongoose.Model<IMessageOverride>) ||
  mongoose.model<IMessageOverride>('MessageOverride', MessageOverrideSchema);

interface IGameSchedule {
  dayNumber: number;
  gameId: string;
}

const GameScheduleSchema = new mongoose.Schema<IGameSchedule>({
  dayNumber: { type: Number, required: true, unique: true },
  gameId: { type: String, required: true },
});

const GameScheduleModel =
  (mongoose.models.GameSchedule as mongoose.Model<IGameSchedule>) ||
  mongoose.model<IGameSchedule>('GameSchedule', GameScheduleSchema);

async function ensureMongo(res: express.Response): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    await connectToMongo();
  }
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'MongoDB database not connected', mongoConnected: false });
    return false;
  }
  return true;
}

// GET /api/admin/messages — all custom day overrides
app.get('/api/admin/messages', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const overrides = await MessageOverrideModel.find({}).sort({ dayNumber: 1 }).lean();
    return res.json({ overrides });
  } catch (err) {
    console.error('Error fetching message overrides:', err);
    return res.status(500).json({ error: 'Failed to fetch message overrides' });
  }
});

// PUT /api/admin/messages/:day — create or update a day's custom content
app.put('/api/admin/messages/:day', async (req, res) => {
  const dayNumber = parseInt(req.params.day, 10);
  if (!dayNumber || dayNumber < 1) {
    return res.status(400).json({ error: 'Invalid day number' });
  }
  if (!(await ensureMongo(res))) return;

  const { title, text, hint, voiceUrl } = req.body;
  const update: Partial<IMessageOverride> = {};
  if (typeof title === 'string') update.title = title.slice(0, 120);
  if (typeof text === 'string') update.text = text.slice(0, 1000);
  if (typeof hint === 'string') update.hint = hint.slice(0, 200);
  if (typeof voiceUrl === 'string') update.voiceUrl = voiceUrl.slice(0, 300);

  try {
    const updated = await MessageOverrideModel.findOneAndUpdate(
      { dayNumber },
      { dayNumber, ...update },
      { upsert: true, new: true }
    );
    return res.json({ success: true, override: updated });
  } catch (err) {
    console.error('Error saving message override:', err);
    return res.status(500).json({ error: 'Failed to save message override' });
  }
});

// DELETE /api/admin/messages/:day — revert a day back to its built-in default
app.delete('/api/admin/messages/:day', async (req, res) => {
  const dayNumber = parseInt(req.params.day, 10);
  if (!(await ensureMongo(res))) return;
  try {
    await MessageOverrideModel.deleteOne({ dayNumber });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting message override:', err);
    return res.status(500).json({ error: 'Failed to delete message override' });
  }
});

// GET /api/admin/game-schedule — all custom day → game assignments
app.get('/api/admin/game-schedule', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const schedule = await GameScheduleModel.find({}).sort({ dayNumber: 1 }).lean();
    return res.json({ schedule });
  } catch (err) {
    console.error('Error fetching game schedule:', err);
    return res.status(500).json({ error: 'Failed to fetch game schedule' });
  }
});

// PUT /api/admin/game-schedule/:day — pin a specific game to a specific day
app.put('/api/admin/game-schedule/:day', async (req, res) => {
  const dayNumber = parseInt(req.params.day, 10);
  const { gameId } = req.body;
  const validGames = ['catch', 'memory', 'reaction', 'rhythm', 'jump', 'flow'];
  if (!dayNumber || dayNumber < 1 || !validGames.includes(gameId)) {
    return res.status(400).json({ error: 'Invalid day number or gameId' });
  }
  if (!(await ensureMongo(res))) return;

  try {
    const updated = await GameScheduleModel.findOneAndUpdate(
      { dayNumber },
      { dayNumber, gameId },
      { upsert: true, new: true }
    );
    return res.json({ success: true, schedule: updated });
  } catch (err) {
    console.error('Error saving game schedule:', err);
    return res.status(500).json({ error: 'Failed to save game schedule' });
  }
});

// DELETE /api/admin/game-schedule/:day — revert back to the automatic rotation
app.delete('/api/admin/game-schedule/:day', async (req, res) => {
  const dayNumber = parseInt(req.params.day, 10);
  if (!(await ensureMongo(res))) return;
  try {
    await GameScheduleModel.deleteOne({ dayNumber });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting game schedule entry:', err);
    return res.status(500).json({ error: 'Failed to delete game schedule entry' });
  }
});

// GET /api/admin/stats — gallery + content overview for the admin dashboard
app.get('/api/admin/stats', async (req, res) => {
  if (!(await ensureMongo(res))) return;
  try {
    const photos = await PhotoModel.find({}).lean();
    const byUploader: Record<string, number> = {};
    let favorites = 0;
    let videos = 0;
    let reactionsTotal = 0;
    let linkedToStars = 0;
    for (const p of photos) {
      const name = p.uploadedBy || 'Белгісіз';
      byUploader[name] = (byUploader[name] || 0) + 1;
      if (p.isFavorite) favorites += 1;
      if (p.mediaType === 'video') videos += 1;
      reactionsTotal += (p.reactions || []).length;
      if (p.linkedDay) linkedToStars += 1;
    }

    const messageOverridesCount = await MessageOverrideModel.countDocuments({});
    const gameScheduleCount = await GameScheduleModel.countDocuments({});

    return res.json({
      totalPhotos: photos.length,
      totalVideos: videos,
      totalFavorites: favorites,
      totalReactions: reactionsTotal,
      totalLinkedToStars: linkedToStars,
      photosByUploader: byUploader,
      customizedDays: messageOverridesCount,
      scheduledDays: gameScheduleCount,
    });
  } catch (err) {
    console.error('Error computing admin stats:', err);
    return res.status(500).json({ error: 'Failed to compute stats' });
  }
});

async function start() {
  await connectToMongo();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API-сервер (backend) запущен на http://localhost:${PORT}`);
  });
}

start();
