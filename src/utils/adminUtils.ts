import { DailyMessage } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export interface MessageOverride {
  dayNumber: number;
  title?: string;
  text?: string;
  hint?: string;
  voiceUrl?: string;
}

export interface GameScheduleEntry {
  dayNumber: number;
  gameId: string;
}

export interface AdminStats {
  totalPhotos: number;
  totalVideos: number;
  totalFavorites: number;
  totalReactions: number;
  totalLinkedToStars: number;
  photosByUploader: Record<string, number>;
  customizedDays: number;
  scheduledDays: number;
}

// Merges a built-in default message with an admin override (if any) — the
// override wins field-by-field, so an admin can change just the hint
// without having to retype the whole message.
export function applyMessageOverride(base: DailyMessage, override?: MessageOverride): DailyMessage {
  if (!override) return base;
  return {
    ...base,
    title: override.title ?? base.title,
    text: override.text ?? base.text,
    hint: override.hint ?? base.hint,
    voiceUrl: override.voiceUrl ?? base.voiceUrl,
  };
}

export async function fetchMessageOverrides(): Promise<MessageOverride[]> {
  const res = await fetch(`${API_BASE}/api/admin/messages`);
  if (!res.ok) throw new Error('Хабарлама баптауларын жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.overrides || []) as MessageOverride[];
}

export async function saveMessageOverride(
  dayNumber: number,
  fields: Partial<Pick<MessageOverride, 'title' | 'text' | 'hint' | 'voiceUrl'>>
): Promise<MessageOverride> {
  const res = await fetch(`${API_BASE}/api/admin/messages/${dayNumber}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('Сақтау мүмкін болмады.');
  const data = await res.json();
  return data.override as MessageOverride;
}

export async function deleteMessageOverride(dayNumber: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/messages/${dayNumber}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Бастапқы күйге қайтару мүмкін болмады.');
}

export async function fetchGameSchedule(): Promise<GameScheduleEntry[]> {
  const res = await fetch(`${API_BASE}/api/admin/game-schedule`);
  if (!res.ok) throw new Error('Ойын кестесін жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.schedule || []) as GameScheduleEntry[];
}

export async function saveGameScheduleDay(dayNumber: number, gameId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/game-schedule/${dayNumber}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) throw new Error('Ойынды тағайындау мүмкін болмады.');
}

export async function deleteGameScheduleDay(dayNumber: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/game-schedule/${dayNumber}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Бастапқы кезекке қайтару мүмкін болмады.');
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/api/admin/stats`);
  if (!res.ok) throw new Error('Статистиканы жүктеу мүмкін болмады.');
  return (await res.json()) as AdminStats;
}
