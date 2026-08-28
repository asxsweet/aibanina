import { StarNode, UserProgress, DailyMessage } from '../types';
import { DAILY_MESSAGES, MILESTONE_BONUSES } from '../data/constants';
import { getCurrentUser } from './authUtils';

// Backend base URL. On Vercel (frontend), set VITE_API_URL to your Render
// backend URL, e.g. https://nashe-sozvezdie-api.onrender.com — no trailing
// slash. Left empty, requests go to a relative /api/... path, which only
// works when the frontend and backend are served from the same origin
// (e.g. local dev via the Vite proxy in vite.config.ts).
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const AVAILABLE_THEMES = ['day', 'night', 'dawn', 'mint', 'velvet'] as const;
export type ThemeName = (typeof AVAILABLE_THEMES)[number];

export function isValidTheme(value: unknown): value is ThemeName {
  return typeof value === 'string' && (AVAILABLE_THEMES as readonly string[]).includes(value);
}

export const AVAILABLE_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type DifficultyName = (typeof AVAILABLE_DIFFICULTIES)[number];

export function isValidDifficulty(value: unknown): value is DifficultyName {
  return typeof value === 'string' && (AVAILABLE_DIFFICULTIES as readonly string[]).includes(value);
}

// COMPENSATION: a timezone bug in the streak/date sync (fixed now) could
// silently reset a streak that was genuinely kept every day, for players
// outside UTC. As an apology, the first bonus theme is unlocked for
// everyone unconditionally — no one should have to re-earn what a bug took
// from them. This sits outside the normal milestone check below, so it
// doesn't touch seenMilestones and the day-7 celebration popup still fires
// normally (as a nice "you'd have earned this anyway" moment).
const COMPENSATION_THEME: ThemeName = 'night';

// Which themes the current streak has unlocked so far. 'day' and the
// compensation theme above are always available; each further theme unlocks
// once its milestone streak in MILESTONE_BONUSES has been reached at least
// once (streaks resetting afterwards don't re-lock an already-earned theme).
export function getUnlockedThemes(streak: number, seenMilestones: number[] = []): ThemeName[] {
  const unlocked: ThemeName[] = ['day', COMPENSATION_THEME];
  MILESTONE_BONUSES.forEach((m) => {
    if (m.theme === COMPENSATION_THEME) return; // already granted above
    if (streak >= m.streak || seenMilestones.includes(m.streak)) {
      unlocked.push(m.theme);
    }
  });
  return unlocked;
}

const STORAGE_KEY = 'nashe_sozvezdie_progress_v1';

function getProgressStorageKey(email?: string): string {
  const currentEmail = (email || getCurrentUser()?.email || 'guest').trim().toLowerCase();
  const safeEmail = currentEmail.replace(/[^a-z0-9]/g, '_') || 'guest';
  return `nashe_sozvezdie_progress_${safeEmail}_v1`;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isYesterday(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(dateStr);
  checkDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - checkDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  return diffDays === 1;
}

export function isSameDay(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr === getTodayDateString();
}

export function getDefaultProgress(): UserProgress {
  return {
    lastPlayedDate: null,
    rewardDate: null,
    streak: 0,
    daysPlayed: 0,
    unlockedDays: [], // e.g. [1, 2, 3]
    soundEnabled: true,
    theme: 'day',
    difficulty: 'medium',
    seenMilestones: [],
  };
}

export function loadProgress(email?: string): UserProgress {
  if (typeof window === 'undefined') return getDefaultProgress();
  try {
    const key = getProgressStorageKey(email);
    const raw = localStorage.getItem(key);
    if (!raw) return getDefaultProgress();
    const parsed: UserProgress = JSON.parse(raw);
    parsed.rewardDate = parsed.rewardDate || parsed.lastPlayedDate || null;
    parsed.theme = isValidTheme(parsed.theme) ? parsed.theme : 'day';
    parsed.difficulty = isValidDifficulty(parsed.difficulty) ? parsed.difficulty : 'medium';
    parsed.seenMilestones = Array.isArray(parsed.seenMilestones) ? parsed.seenMilestones : [];

    // Check if streak broke due to missed days
    if (parsed.lastPlayedDate) {
      const today = getTodayDateString();
      if (parsed.lastPlayedDate !== today && !isYesterday(parsed.lastPlayedDate)) {
        // Missed at least one whole day -> reset streak to 0 until played
        parsed.streak = 0;
      }
    }
    return parsed;
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(progress: UserProgress, email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getProgressStorageKey(email);
    localStorage.setItem(key, JSON.stringify(progress));
    // Asynchronously sync with MongoDB backend
    saveProgressToMongo(progress);
  } catch (e) {
    console.error('Failed to save progress to localStorage', e);
  }
}

// Identity used to key a player's progress on the backend. This intentionally
// matches the identity used by logDayCompletion (see trackingUtils.ts,
// UserProgressSnapshot.userId — "this is the player's account email"): both
// used to be separate IDs (this one was a random per-browser string), which
// meant a) the admin panel showed a meaningless random hash instead of the
// player's real account, b) day-log rows never matched a selected partner's
// progress row since they were keyed differently, and c) logging in on a new
// device started a brand-new empty progress instead of resuming the account's
// real progress. Falling back to a random per-browser guest ID only when no
// account is logged in.
export function getUserId(): string {
  if (typeof window === 'undefined') return 'default_user';
  const account = getCurrentUser();
  if (account?.email) return account.email.trim().toLowerCase();
  let userId = localStorage.getItem('nashe_sozvezdie_user_id');
  if (!userId) {
    userId = 'guest_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('nashe_sozvezdie_user_id', userId);
  }
  return userId;
}

export async function saveProgressToMongo(progress: UserProgress): Promise<boolean> {
  try {
    const userId = getUserId();
    // Send the account's chosen display name alongside progress so the admin
    // panel can show a real name instead of falling back to the raw email/id.
    const name = getCurrentUser()?.name || null;
    // lastPlayedDate (YYYY-MM-DD, player's local calendar day) is sent as-is
    // and is the only field streak logic should trust. lastPlayTimestamp is
    // just "when this sync happened" — never reconstruct it from local
    // midnight, since the server later reads timestamps back as UTC and that
    // round trip silently shifts the calendar day for any non-UTC timezone.
    const payload = {
      userId,
      progress: {
        ...progress,
        name,
        lastPlayTimestamp: Date.now(),
      },
    };

    const res = await fetch(`${API_BASE}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.warn('MongoDB sync note:', err);
    return false;
  }
}

export async function loadProgressFromMongo(): Promise<UserProgress | null> {
  try {
    const userId = getUserId();
    const res = await fetch(`${API_BASE}/api/progress/${userId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.daysPlayed === 'number') {
      const lastPlayedDate = data.lastPlayedDate || (data.lastPlayTimestamp
        ? new Date(data.lastPlayTimestamp).toISOString().split('T')[0]
        : null);

      return {
        daysPlayed: data.daysPlayed,
        lastPlayedDate,
        rewardDate: lastPlayedDate,
        streak: data.streak || 0,
        unlockedDays: data.unlockedDays || [],
        soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : true,
        theme: isValidTheme(data.theme) ? data.theme : 'day',
        difficulty: isValidDifficulty(data.difficulty) ? data.difficulty : 'medium',
      };
    }
    return null;
  } catch (err) {
    console.warn('MongoDB fetch note:', err);
    return null;
  }
}


export const CHAPTER_SIZE = 30;

export function getChapterForDay(dayNumber: number): number {
  return Math.max(1, Math.ceil(dayNumber / CHAPTER_SIZE));
}

export function getChapterRange(chapterIndex: number): { start: number; end: number } {
  const start = (chapterIndex - 1) * CHAPTER_SIZE + 1;
  const end = chapterIndex * CHAPTER_SIZE;
  return { start, end };
}

// Generate spiral points for one chapter's constellation (Golden Ratio / Phyllotaxis).
// Every chapter is its own fresh 30-star spiral — like a new area unlocking on a
// level-map once the previous one is finished — but they all read as the same
// continuous night sky, just paged through via the chapter selector.
export function generateConstellationNodes(
  daysPlayedCount: number,
  unlockedDays: number[],
  chapterIndex: number = 1,
  chapterSize: number = CHAPTER_SIZE
): StarNode[] {
  const nodes: StarNode[] = [];
  const centerX = 200; // SVG canvas size 400x400
  const centerY = 200;
  const goldenAngle = 137.507764 * (Math.PI / 180);
  const { start: chapterStartDay } = getChapterRange(chapterIndex);

  // Custom nice initial spread so 30 stars look like a beautiful romantic constellation
  for (let i = 0; i < chapterSize; i++) {
    const dayNum = chapterStartDay + i;
    // Spiral radius grows smoothly, restarting fresh at the top of each chapter
    const r = 24 + Math.sqrt(i + 1) * 28;
    const theta = i * goldenAngle;

    const x = centerX + r * Math.cos(theta);
    const y = centerY + r * Math.sin(theta);

    // Pick daily message from array with cycling (same 30 texts reused per chapter
    // until you add more of your own in constants.ts)
    const msgIndex = (dayNum - 1) % DAILY_MESSAGES.length;
    const message: DailyMessage = {
      ...DAILY_MESSAGES[msgIndex],
      dayNumber: dayNum,
    };

    const isUnlocked = unlockedDays.includes(dayNum) || dayNum <= daysPlayedCount;

    nodes.push({
      id: dayNum,
      dayNumber: dayNum,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      message,
      unlocked: isUnlocked,
    });
  }

  return nodes;
}
