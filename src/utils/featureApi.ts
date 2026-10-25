import { API_BASE } from './apiClient';

// Thin client for the "extras" endpoints (joint streak, special days, meeting
// countdown, wishes, game records). The Authorization header is added
// automatically by the fetch wrapper installed in main.tsx. Every function
// swallows network errors and returns null / { ok: false } — none of these are
// critical, so the game itself never breaks when the server is asleep.

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...(init.headers || {}) } : init?.headers,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // empty / non-JSON body
    }
    return { ok: res.ok, status: res.status, data: res.ok ? (data as T) : null, error: res.ok ? undefined : data?.error };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Серверге қосыла алмадым.' };
  }
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// ------------------------------------------------------------- joint streak

export interface JointState {
  todayDate: string;
  today: { partner: boolean; admin: boolean };
  streak: number;
  best: number;
}

export async function fetchJoint(date: string): Promise<JointState | null> {
  const r = await api<JointState>(`/api/joint?date=${encodeURIComponent(date)}`);
  return r.data;
}

export async function checkinJoint(date: string, streak?: number): Promise<JointState | null> {
  const r = await api<JointState>('/api/joint/checkin', json('POST', { date, streak }));
  return r.data;
}

// ------------------------------------------------------------ special stars

export interface SpecialDayItem {
  id: string;
  title: string;
  text: string;
  hint: string;
  emoji: string;
}

export async function fetchSpecialDaysToday(date: string): Promise<SpecialDayItem[]> {
  const r = await api<{ items: SpecialDayItem[] }>(`/api/special-days/today?date=${encodeURIComponent(date)}`);
  return r.data?.items ?? [];
}

// ------------------------------------------------------------------ meeting

export interface Meeting {
  date: string; // YYYY-MM-DD
  label: string;
}

export async function fetchMeeting(): Promise<Meeting | null> {
  const r = await api<{ meeting: Meeting | null }>('/api/meeting');
  return r.data?.meeting ?? null;
}

// ------------------------------------------------------------------- wishes

export async function sendWish(text: string, cost: number): Promise<{ ok: boolean; error?: string }> {
  const r = await api<{ wish: unknown }>('/api/wishes', json('POST', { text, cost }));
  return { ok: r.ok, error: r.error };
}

export interface WishRow {
  id: string;
  userId: string;
  name: string;
  text: string;
  cost: number;
  status: 'new' | 'done';
  createdAt: number;
  doneAt: number | null;
}

export async function fetchMyWishes(): Promise<WishRow[]> {
  const r = await api<{ wishes: WishRow[] }>('/api/wishes/mine');
  return r.data?.wishes ?? [];
}

// ------------------------------------------------------------------ records

export interface ScoreResult {
  bestMs: number;
  isRecord: boolean;
  previousBestMs: number | null;
  bestValue: number;
  metric: 'time' | 'score';
  previousBestValue: number | null;
  rival: { name: string; bestMs: number; bestValue: number; metric: 'time' | 'score' } | null;
}

export async function submitScore(gameId: string, difficulty: string, durationMs: number, scoreValue?: number): Promise<ScoreResult | null> {
  const metric = typeof scoreValue === 'number' ? 'score' : 'time';
  const r = await api<ScoreResult>('/api/scores', json('POST', { gameId, difficulty, durationMs, scoreValue, metric }));
  return r.data;
}

export interface ScoreRow {
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

export async function fetchScores(): Promise<{ me: string; scores: ScoreRow[] } | null> {
  const r = await api<{ me: string; scores: ScoreRow[] }>('/api/scores');
  return r.data;
}

export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)} с`;
}

// -------------------------------------------------------------------- admin

export interface AdminSpecialDay {
  id: string;
  month: number;
  day: number;
  year: number | null;
  title: string;
  text: string;
  hint: string;
  emoji: string;
  enabled: boolean;
}

export type SpecialDayInput = Omit<AdminSpecialDay, 'id'>;

export async function adminListSpecialDays(): Promise<AdminSpecialDay[]> {
  const r = await api<{ specialDays: AdminSpecialDay[] }>('/api/admin/special-days');
  return r.data?.specialDays ?? [];
}

export async function adminSaveSpecialDay(
  input: SpecialDayInput,
  id?: string
): Promise<{ ok: boolean; error?: string }> {
  const r = id
    ? await api(`/api/admin/special-days/${encodeURIComponent(id)}`, json('PUT', input))
    : await api('/api/admin/special-days', json('POST', input));
  return { ok: r.ok, error: r.error };
}

export async function adminDeleteSpecialDay(id: string): Promise<boolean> {
  return (await api(`/api/admin/special-days/${encodeURIComponent(id)}`, json('DELETE'))).ok;
}

export async function adminSeedSpecialDays(): Promise<number | null> {
  const r = await api<{ added: number }>('/api/admin/special-days/seed-defaults', json('POST', {}));
  return r.data ? r.data.added : null;
}

export async function adminSetMeeting(date: string, label: string): Promise<{ ok: boolean; error?: string }> {
  const r = await api('/api/admin/meeting', json('PUT', { date, label }));
  return { ok: r.ok, error: r.error };
}

export async function adminClearMeeting(): Promise<boolean> {
  return (await api('/api/admin/meeting', json('DELETE'))).ok;
}

export async function adminListWishes(): Promise<WishRow[]> {
  const r = await api<{ wishes: WishRow[] }>('/api/admin/wishes');
  return r.data?.wishes ?? [];
}

export async function adminMarkWish(id: string, status: 'new' | 'done'): Promise<boolean> {
  return (await api(`/api/admin/wishes/${encodeURIComponent(id)}`, json('PATCH', { status }))).ok;
}
