const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export interface UserProgressSnapshot {
  userId: string; // this is the player's account email
  name: string | null; // display name chosen in the account profile, if any
  daysPlayed: number;
  streak: number;
  unlockedDays: number[];
  lastPlayedDate: string | null; // YYYY-MM-DD
  lastPlayTimestamp: number;
  theme: string;
}

export interface DayLogEntry {
  userId: string;
  dayNumber: number;
  completedAt: number; // ms timestamp — first moment that day's star was earned
}

// Every registered player's current snapshot — lets the admin panel list
// who's playing without needing to already know their email/userId.
export async function fetchUsersProgress(): Promise<UserProgressSnapshot[]> {
  const res = await fetch(`${API_BASE}/api/admin/users-progress`);
  if (!res.ok) throw new Error('Пайдаланушылар прогресін жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.users || []) as UserProgressSnapshot[];
}

// Every (userId, dayNumber, completedAt) row ever logged — the real history
// of when each star was earned, since UserProgress only keeps the latest.
export async function fetchDayLogs(): Promise<DayLogEntry[]> {
  const res = await fetch(`${API_BASE}/api/admin/day-logs`);
  if (!res.ok) throw new Error('Күндер тарихын жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.logs || []) as DayLogEntry[];
}

// Called once, right when a new day's star is earned (see App.tsx's
// updateProgress). Fire-and-forget from the caller's side — a failure here
// only means the admin's history view is missing one row, nothing the
// player is doing is affected.
export async function logDayCompletion(userId: string, dayNumber: number): Promise<void> {
  await fetch(`${API_BASE}/api/day-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dayNumber }),
  });
}
