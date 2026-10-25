import { StarNode, UserProgress, DailyMessage } from '../types';
import { DAILY_MESSAGES, MILESTONE_BONUSES } from '../data/constants';
import { getCurrentUser } from './authUtils';
import { API_BASE } from './apiClient';
import { THEME_IDS, isThemeName } from '../data/themes';
import type { ThemeName } from '../data/themes';
import { PROGRESS_VERSION, migrateProgress, normalizeStreakForToday, mergeMonotonic } from './streakUtils';

// Backend base URL: see ./apiClient.ts (VITE_API_URL). Left empty, requests go
// to a relative /api/... path, which only works when the frontend and backend
// share an origin (e.g. local dev via the Vite proxy in vite.config.ts).

// Kept as re-exports so the many components importing these from here keep working.
export const AVAILABLE_THEMES = THEME_IDS;
export type { ThemeName };

export function isValidTheme(value: unknown): value is ThemeName {
  return isThemeName(value);
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

// Which themes she owns. 'day' and the compensation theme above are always
// available; every other theme is unlocked for good once its milestone streak
// in MILESTONE_BONUSES has been reached (remembered in earnedThemes, so a
// streak reset never takes an already-earned theme away).
export function getUnlockedThemes(progress: Pick<UserProgress, 'streak' | 'earnedThemes'>): ThemeName[] {
  const owned = new Set<ThemeName>(['day', COMPENSATION_THEME]);
  (progress.earnedThemes || []).forEach((theme) => {
    if (isThemeName(theme)) owned.add(theme);
  });
  MILESTONE_BONUSES.forEach((m) => {
    if ((progress.streak || 0) >= m.streak) owned.add(m.theme);
  });
  // Keep the canonical order (the order they unlock in).
  return AVAILABLE_THEMES.filter((theme) => owned.has(theme));
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

  // `new Date(dateStr)` on a plain "YYYY-MM-DD" string is parsed as UTC
  // midnight per the ECMAScript spec, then silently reinterpreted in local
  // time — which rolls it back to the *previous* calendar day in any
  // timezone behind UTC (Europe, the Americas, etc.), even though the
  // player didn't miss a day. Parsing the y/m/d components by hand and
  // building the Date in local time sidesteps that shift entirely.
  const [year, month, day] = dateStr.split('-').map(Number);
  const checkDate = new Date(year, month - 1, day);
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
    earnedThemes: [],
    bestStreak: 0,
    shields: 0,
    shieldDates: [],
    playedDates: [],
    stardust: 0,
    stardustDate: null,
    stardustToday: 0,
    revealedDays: [],
    progressVersion: PROGRESS_VERSION,
  };
}

export function loadProgress(email?: string): UserProgress {
  if (typeof window === 'undefined') return getDefaultProgress();
  try {
    const key = getProgressStorageKey(email);
    const raw = localStorage.getItem(key);
    if (!raw) return getDefaultProgress();
    let parsed: UserProgress = JSON.parse(raw);
    parsed.rewardDate = parsed.rewardDate || parsed.lastPlayedDate || null;
    parsed.theme = isValidTheme(parsed.theme) ? parsed.theme : 'day';
    parsed.difficulty = isValidDifficulty(parsed.difficulty) ? parsed.difficulty : 'medium';
    parsed.seenMilestones = Array.isArray(parsed.seenMilestones) ? parsed.seenMilestones : [];

    // Bring old saves up to the current streak/theme ladder (grandfathers any
    // theme she already unlocked), then drop a streak that could not be saved.
    parsed = migrateProgress(parsed, MILESTONE_BONUSES);
    return normalizeStreakForToday(parsed, getTodayDateString());
  } catch {
    return getDefaultProgress();
  }
}

export interface SaveProgressOptions {
  // Push to the backend too. The app turns this off until the server copy has
  // been fetched, so a fresh/stale device can never overwrite newer progress.
  syncRemote?: boolean;
  // Explicit reset (Settings): the only write the server accepts with a lower daysPlayed.
  reset?: boolean;
}

export function saveProgress(progress: UserProgress, email?: string, options: SaveProgressOptions = {}): void {
  if (typeof window === 'undefined') return;
  const { syncRemote = true, reset = false } = options;
  try {
    const key = getProgressStorageKey(email);
    const stamped: UserProgress = { ...progress, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(stamped));
    // Asynchronously sync with MongoDB backend
    if (syncRemote) saveProgressToMongo(stamped, { reset });
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

export async function saveProgressToMongo(
  progress: UserProgress,
  options: { reset?: boolean } = {}
): Promise<boolean> {
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
        reset: options.reset === true,
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
    const res = await fetch(`${API_BASE}/api/progress/${encodeURIComponent(userId)}`);
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
        seenMilestones: Array.isArray(data.seenMilestones) ? data.seenMilestones : [],
        earnedThemes: Array.isArray(data.earnedThemes) ? data.earnedThemes.filter(isThemeName) : [],
        shields: typeof data.shields === 'number' ? data.shields : undefined,
        shieldDates: Array.isArray(data.shieldDates) ? data.shieldDates : [],
        playedDates: Array.isArray(data.playedDates) ? data.playedDates : [],
        bestStreak: typeof data.bestStreak === 'number' ? data.bestStreak : 0,
        stardust: typeof data.stardust === 'number' ? data.stardust : 0,
        stardustDate: typeof data.stardustDate === 'string' ? data.stardustDate : null,
        stardustToday: typeof data.stardustToday === 'number' ? data.stardustToday : 0,
        revealedDays: Array.isArray(data.revealedDays) ? data.revealedDays : [],
        progressVersion: typeof data.progressVersion === 'number' ? data.progressVersion : 0,
        savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
        adminEditedAt: typeof data.adminEditedAt === 'number' ? data.adminEditedAt : 0,
      };
    }
    return null;
  } catch (err) {
    console.warn('MongoDB fetch note:', err);
    return null;
  }
}


// Decides what to do once the server copy has arrived after the local copy was
// already loaded. The fresher copy wins as a whole (more stars, or the same
// day but saved later), and the lists that only ever grow (calendar days,
// earned themes, shown popups) are merged so neither device can lose them.
export function reconcileProgress(
  local: UserProgress,
  remoteRaw: UserProgress | null,
  today: string = getTodayDateString()
): { progress: UserProgress; changed: boolean } {
  if (!remoteRaw) return { progress: local, changed: false };

  const remote = normalizeStreakForToday(migrateProgress(remoteRaw, MILESTONE_BONUSES), today);

  // An admin edit/reset newer than anything this device has seen is authoritative,
  // even when it lowers the numbers (otherwise a reset would be undone by the
  // device that is still "ahead"). Earned themes / shown popups are never taken away.
  if ((remote.adminEditedAt || 0) > (local.adminEditedAt || 0)) {
    const union = <T,>(a?: T[], b?: T[]): T[] => Array.from(new Set([...(a || []), ...(b || [])]));
    return {
      progress: {
        ...remote,
        earnedThemes: union(remote.earnedThemes, local.earnedThemes),
        seenMilestones: union(remote.seenMilestones, local.seenMilestones),
      },
      changed: true,
    };
  }

  const sameDay = remote.daysPlayed === local.daysPlayed;
  const remoteWins =
    remote.daysPlayed > local.daysPlayed ||
    (sameDay &&
      (!local.lastPlayedDate ||
        (!!remote.lastPlayedDate && remote.lastPlayedDate > local.lastPlayedDate) ||
        (remote.lastPlayedDate === local.lastPlayedDate && (remote.savedAt || 0) > (local.savedAt || 0))));

  const merged = remoteWins ? mergeMonotonic(remote, local) : mergeMonotonic(local, remote);
  // The merged lists are unions that already contain everything local had, so
  // "longer than local's" means the server taught us something new (e.g. the
  // rebuilt calendar history). Comparing JSON would flag harmless key-order
  // or empty-default differences and trigger pointless re-saves.
  const grew = (m?: unknown[], l?: unknown[]) => (m?.length || 0) > (l?.length || 0);
  const changed =
    remoteWins ||
    grew(merged.playedDates, local.playedDates) ||
    grew(merged.shieldDates, local.shieldDates) ||
    grew(merged.earnedThemes, local.earnedThemes) ||
    grew(merged.seenMilestones, local.seenMilestones) ||
    grew(merged.revealedDays, local.revealedDays) ||
    grew(merged.unlockedDays, local.unlockedDays) ||
    (merged.bestStreak || 0) > (local.bestStreak || 0);
  return { progress: changed ? merged : local, changed };
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
