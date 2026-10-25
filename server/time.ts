// Small date helpers shared by the server modules.

// IANA timezone the app lives in (her local time), independent of whatever
// timezone the hosting server itself happens to run in.
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Almaty';

// "Today" (or any moment), computed in the given timezone — the same
// YYYY-MM-DD shape UserProgress.lastPlayedDate uses.
export function getDateStringInTimezone(timeZone: string = APP_TIMEZONE, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

// YYYY-MM-DD -> number of whole days since 1970-01-01 (pure calendar maths,
// no timezone involved, so it can be used to compare two calendar days).
export function dayIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function isValidDateStr(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function indexToDate(index: number): string {
  const dt = new Date(index * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysStr(date: string, n: number): string {
  return indexToDate(dayIndex(date) + n);
}
