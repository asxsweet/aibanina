import type { UserProgress } from '../types';
import type { ThemeName } from '../data/themes';

// Pure streak / shield / stardust / calendar logic. No React, no storage, no
// network — every function takes the data it needs (including "today") and
// returns a new value, so it is easy to test and reason about.

// ---------------------------------------------------------------- constants

export const MAX_SHIELDS = 2; // a player can hold at most this many shields
export const SHIELD_EVERY_STREAK = 7; // +1 shield every time the streak hits a multiple of this
export const SHIELD_PRICE = 30; // stardust
export const PEEK_PRICE = 10; // stardust — reveal tomorrow's star title
export const WISH_PRICE = 50; // stardust — send a wish to him

export const DAILY_STAR_STARDUST = 5; // earned together with the daily star
export const BONUS_STARDUST: Record<'easy' | 'medium' | 'hard', number> = { easy: 2, medium: 3, hard: 5 };
export const BONUS_STARDUST_DAILY_CAP = 20; // max stardust per day from replaying bonus games

export const KK_MONTHS = [
  'Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым',
  'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан',
];
export const KK_WEEKDAYS_SHORT = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жк']; // Monday first

// -------------------------------------------------------------- date helpers
// Calendar days are plain YYYY-MM-DD strings (the player's local day). All
// arithmetic goes through UTC day counts so DST / timezones can't shift a day.

export function dateIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function indexToDate(index: number): string {
  const dt = new Date(index * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, n: number): string {
  return indexToDate(dateIndex(date) + n);
}

// Whole days from `from` to `to` (positive when `to` is later).
export function daysBetween(from: string, to: string): number {
  return dateIndex(to) - dateIndex(from);
}

// How many whole days were skipped between the last claimed day and today.
// 0 when she played today or yesterday (or the clock went backwards).
export function missedDaysBetween(lastPlayedDate: string | null, today: string): number {
  if (!lastPlayedDate) return 0;
  const gap = daysBetween(lastPlayedDate, today);
  return gap >= 2 ? gap - 1 : 0;
}

const clampInt = (v: unknown, min: number, max: number, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : fallback;

const uniqueSorted = (list: string[], max: number): string[] => Array.from(new Set(list)).sort().slice(-max);

// ------------------------------------------------------------ streak + shield

// Called when a saved progress is loaded: if days were skipped and there are
// not enough shields to cover them, the streak is gone (0). If shields CAN
// cover them the streak is kept — the shields are spent only when she
// actually claims her next star (see applyDailyClaim).
export function normalizeStreakForToday(p: UserProgress, today: string): UserProgress {
  const missed = missedDaysBetween(p.lastPlayedDate, today);
  if (missed === 0) return p;
  if ((p.shields || 0) >= missed) return p;
  if (p.streak === 0) return p;
  return { ...p, streak: 0 };
}

// The streak number to show right now (same rule as normalizeStreakForToday).
export function getEffectiveStreak(p: UserProgress, today: string): number {
  return normalizeStreakForToday(p, today).streak;
}

// True when she missed at least one day but her shields would still save the streak.
export function isStreakShielded(p: UserProgress, today: string): boolean {
  const missed = missedDaysBetween(p.lastPlayedDate, today);
  return missed > 0 && (p.shields || 0) >= missed && p.streak > 0;
}

export interface ClaimResult {
  progress: UserProgress;
  streakBroken: boolean; // streak restarted from 1 (days were missed, not enough shields)
  shieldsUsed: number; // shields spent to cover missed days
  shieldEarned: boolean; // a new shield was granted (every 7th streak day)
}

// Claiming today's star: advances the day counter and the streak (using
// shields to bridge missed days when possible), records the date for the
// calendar, tracks the best streak, and pays the daily stardust.
export function applyDailyClaim(p: UserProgress, today: string): ClaimResult {
  const last = p.lastPlayedDate;
  const prevStreak = p.streak || 0;
  let shields = clampInt(p.shields, 0, MAX_SHIELDS);
  let streak = prevStreak;
  let streakBroken = false;
  let shieldsUsed = 0;
  const shieldDates = [...(p.shieldDates || [])];

  if (!last) {
    streak = 1;
  } else {
    const gap = daysBetween(last, today);
    if (gap <= 0) {
      // Same day (or a clock that moved backwards): never advance the streak twice.
      streak = Math.max(prevStreak, 1);
    } else if (gap === 1) {
      streak = prevStreak + 1;
    } else {
      const missed = gap - 1;
      if (shields >= missed) {
        streak = prevStreak + 1;
        shields -= missed;
        shieldsUsed = missed;
        for (let k = 1; k <= missed; k++) shieldDates.push(addDays(last, k));
      } else {
        // The streak restarts, but the constellation itself keeps growing.
        streak = 1;
        streakBroken = true;
      }
    }
  }

  let shieldEarned = false;
  if (!streakBroken && streak > prevStreak && streak % SHIELD_EVERY_STREAK === 0 && shields < MAX_SHIELDS) {
    shields += 1;
    shieldEarned = true;
  }

  const nextDaysPlayed = (p.daysPlayed || 0) + 1;
  const progress: UserProgress = {
    ...p,
    lastPlayedDate: today,
    rewardDate: today,
    daysPlayed: nextDaysPlayed,
    streak,
    bestStreak: Math.max(clampInt(p.bestStreak, 0, 1e6), streak),
    shields,
    shieldDates: uniqueSorted(shieldDates, 200),
    playedDates: uniqueSorted([...(p.playedDates || []), today], 800),
    unlockedDays: [...new Set([...(p.unlockedDays || []), nextDaysPlayed])],
    stardust: clampInt(p.stardust, 0, 1e9) + DAILY_STAR_STARDUST,
  };

  return { progress, streakBroken, shieldsUsed, shieldEarned };
}

// ------------------------------------------------------------------ stardust

// Bonus replays (after the daily star is already claimed) pay a little
// stardust, capped per day so it can't be farmed endlessly.
export function awardBonusStardust(
  p: UserProgress,
  difficulty: 'easy' | 'medium' | 'hard' | undefined,
  today: string
): { progress: UserProgress; earned: number } {
  const earnedSoFar = p.stardustDate === today ? clampInt(p.stardustToday, 0, 1e6) : 0;
  const base = BONUS_STARDUST[difficulty || 'medium'] ?? BONUS_STARDUST.medium;
  const earned = Math.max(0, Math.min(base, BONUS_STARDUST_DAILY_CAP - earnedSoFar));
  if (earned === 0) return { progress: { ...p, stardustDate: today, stardustToday: earnedSoFar }, earned: 0 };
  return {
    progress: {
      ...p,
      stardust: clampInt(p.stardust, 0, 1e9) + earned,
      stardustDate: today,
      stardustToday: earnedSoFar + earned,
    },
    earned,
  };
}

// ok: true  -> `progress` holds the updated state
// ok: false -> `reason` explains why nothing was bought
export interface ShopResult {
  ok: boolean;
  progress?: UserProgress;
  reason?: string;
}

export function buyShield(p: UserProgress): ShopResult {
  const stardust = clampInt(p.stardust, 0, 1e9);
  const shields = clampInt(p.shields, 0, MAX_SHIELDS);
  if (shields >= MAX_SHIELDS) return { ok: false, reason: `Қалқан толы (максимум ${MAX_SHIELDS}).` };
  if (stardust < SHIELD_PRICE) return { ok: false, reason: 'Жұлдыз тозаңы жетпейді.' };
  return { ok: true, progress: { ...p, stardust: stardust - SHIELD_PRICE, shields: shields + 1 } };
}

export function buyPeek(p: UserProgress, dayNumber: number): ShopResult {
  const stardust = clampInt(p.stardust, 0, 1e9);
  if ((p.revealedDays || []).includes(dayNumber)) return { ok: false, reason: 'Бұл жұлдыз әлдеқашан ашылған.' };
  if (stardust < PEEK_PRICE) return { ok: false, reason: 'Жұлдыз тозаңы жетпейді.' };
  return {
    ok: true,
    progress: { ...p, stardust: stardust - PEEK_PRICE, revealedDays: [...(p.revealedDays || []), dayNumber] },
  };
}

export function spendForWish(p: UserProgress): ShopResult {
  const stardust = clampInt(p.stardust, 0, 1e9);
  if (stardust < WISH_PRICE) return { ok: false, reason: 'Жұлдыз тозаңы жетпейді.' };
  return { ok: true, progress: { ...p, stardust: stardust - WISH_PRICE } };
}

// ------------------------------------------------------------ next milestone

export interface LadderStep {
  streak: number;
  theme: string;
}

// The first theme on the ladder she has not unlocked yet (null when all are owned).
export function getNextMilestone<T extends LadderStep>(
  ladder: T[],
  streak: number,
  earnedThemes: readonly string[] = []
): { milestone: T; daysLeft: number } | null {
  const next = ladder.find((m) => streak < m.streak && !earnedThemes.includes(m.theme));
  if (!next) return null;
  return { milestone: next, daysLeft: next.streak - streak };
}

// -------------------------------------------------------------- tomorrow teaser

// "Сен — менің үйім" -> "С•• — м••• ү••": keeps first letters so it feels like a
// riddle, but never gives the whole title away.
export function maskTitle(title: string): string {
  return title.replace(/[\p{L}\p{N}]+/gu, (word) =>
    word.length <= 1 ? '•' : word[0] + '•'.repeat(Math.min(word.length - 1, 6))
  );
}

// ------------------------------------------------------------------ calendar

export type CalendarDayState = 'played' | 'shield' | 'missed' | 'pending' | 'future' | 'before';

export interface CalendarCell {
  date: string;
  day: number;
  state: CalendarDayState;
  isToday: boolean;
}

// Monday-first month grid. `pending` = today, not claimed yet. `before` = a
// day earlier than her very first star (nothing to show, not a miss).
export function buildMonthGrid(
  year: number,
  month0: number,
  playedDates: string[],
  shieldDates: string[],
  today: string
): (CalendarCell | null)[][] {
  const played = new Set(playedDates);
  const shielded = new Set(shieldDates);
  const all = [...playedDates, ...shieldDates].sort();
  const firstActive = all.length ? all[0] : null;

  const firstWeekday = (new Date(Date.UTC(year, month0, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

  const cells: (CalendarCell | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = date === today;
    let state: CalendarDayState;
    if (played.has(date)) state = 'played';
    else if (shielded.has(date)) state = 'shield';
    else if (isToday) state = 'pending';
    else if (date > today) state = 'future';
    else if (firstActive && date >= firstActive) state = 'missed';
    else state = 'before';
    cells.push({ date, day, state, isToday });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// ----------------------------------------------------------------- migration

// Old (pre-ladder-v2) builds unlocked themes at streaks 7 / 1 / 10 / 14 by
// mistake (the titles said 14 / 21 / 30). Anything she legitimately unlocked
// back then stays unlocked — we grandfather it in `earnedThemes`.
const LEGACY_THEME_STREAKS: { streak: number; theme: ThemeName }[] = [
  { streak: 7, theme: 'night' },
  { streak: 1, theme: 'dawn' },
  { streak: 10, theme: 'mint' },
  { streak: 14, theme: 'velvet' },
];

export const PROGRESS_VERSION = 2;

export function migrateProgress(p: UserProgress, ladder: LadderStep[]): UserProgress {
  if ((p.progressVersion || 0) >= PROGRESS_VERSION) return p;

  const seenOld = p.seenMilestones || [];
  const earned = new Set<ThemeName>(['day', 'night']);
  LEGACY_THEME_STREAKS.forEach(({ streak, theme }) => {
    if ((p.streak || 0) >= streak || seenOld.includes(streak)) earned.add(theme);
  });
  (p.earnedThemes || []).forEach((t) => earned.add(t));
  if (p.theme) earned.add(p.theme); // whatever she is wearing right now stays hers

  // Popups already "seen" in the new ladder: every theme she already owns
  // (the Night popup only if she really saw the old day-7 one).
  const seen = ladder
    .filter((m) => (m.theme === 'night' ? seenOld.includes(7) : earned.has(m.theme as ThemeName)))
    .map((m) => m.streak);

  return {
    ...p,
    earnedThemes: Array.from(earned),
    seenMilestones: seen,
    bestStreak: Math.max(clampInt(p.bestStreak, 0, 1e6), clampInt(p.streak, 0, 1e6)),
    // A welcome gift for players who were already collecting stars.
    shields: p.shields ?? ((p.daysPlayed || 0) > 0 ? 1 : 0),
    shieldDates: p.shieldDates || [],
    playedDates: p.playedDates || (p.lastPlayedDate ? [p.lastPlayedDate] : []),
    stardust: p.stardust ?? 0,
    stardustDate: p.stardustDate ?? null,
    stardustToday: p.stardustToday ?? 0,
    revealedDays: p.revealedDays || [],
    progressVersion: PROGRESS_VERSION,
  };
}

// Merge the lists that only ever grow (so syncing two devices can't lose a
// calendar day, a theme or a popup that was already shown on the other one).
export function mergeMonotonic(chosen: UserProgress, other: UserProgress): UserProgress {
  const union = <T,>(a?: T[], b?: T[]): T[] => Array.from(new Set([...(a || []), ...(b || [])]));
  return {
    ...chosen,
    unlockedDays: union(chosen.unlockedDays, other.unlockedDays),
    earnedThemes: union(chosen.earnedThemes, other.earnedThemes),
    seenMilestones: union(chosen.seenMilestones, other.seenMilestones),
    revealedDays: union(chosen.revealedDays, other.revealedDays),
    playedDates: uniqueSorted(union(chosen.playedDates, other.playedDates), 800),
    shieldDates: uniqueSorted(union(chosen.shieldDates, other.shieldDates), 200),
    bestStreak: Math.max(chosen.bestStreak || 0, other.bestStreak || 0),
  };
}
