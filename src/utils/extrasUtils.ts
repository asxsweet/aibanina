import { DailyReply, TimeCapsule, DreamItem } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// --- Daily two-way replies -------------------------------------------------

export async function fetchReply(dayNumber: number): Promise<DailyReply | null> {
  const res = await fetch(`${API_BASE}/api/replies/${dayNumber}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Жауапты жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.reply || null) as DailyReply | null;
}

// All replies at once — used by the admin panel to review every day's
// mood/text answer in one place, instead of fetching day-by-day.
export async function fetchAllReplies(): Promise<DailyReply[]> {
  const res = await fetch(`${API_BASE}/api/replies`);
  if (!res.ok) throw new Error('Жауаптарды жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.replies || []) as DailyReply[];
}

export async function saveReply(
  dayNumber: number,
  fields: { mood?: string; text?: string }
): Promise<DailyReply> {
  const res = await fetch(`${API_BASE}/api/replies/${dayNumber}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('Сақтау мүмкін болмады.');
  const data = await res.json();
  return data.reply as DailyReply;
}

// --- Time capsules ----------------------------------------------------------

export async function fetchCapsules(): Promise<TimeCapsule[]> {
  const res = await fetch(`${API_BASE}/api/capsules`);
  if (!res.ok) throw new Error('Хаттарды жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.capsules || []) as TimeCapsule[];
}

export async function createCapsule(
  title: string,
  text: string,
  unlockDate: string
): Promise<TimeCapsule> {
  const res = await fetch(`${API_BASE}/api/capsules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, text, unlockDate }),
  });
  if (!res.ok) throw new Error('Хатты сақтау мүмкін болмады.');
  const data = await res.json();
  return data.capsule as TimeCapsule;
}

export async function deleteCapsule(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/capsules/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Хатты өшіру мүмкін болмады.');
}

// --- Shared dreams / plans checklist -----------------------------------------

export async function fetchDreams(): Promise<DreamItem[]> {
  const res = await fetch(`${API_BASE}/api/dreams`);
  if (!res.ok) throw new Error('Тізімді жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.dreams || []) as DreamItem[];
}

export async function addDream(text: string, createdBy: string): Promise<DreamItem> {
  const res = await fetch(`${API_BASE}/api/dreams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, createdBy }),
  });
  if (!res.ok) throw new Error('Қосу мүмкін болмады.');
  const data = await res.json();
  return data.dream as DreamItem;
}

export async function toggleDream(id: string, isDone: boolean): Promise<DreamItem> {
  const res = await fetch(`${API_BASE}/api/dreams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDone }),
  });
  if (!res.ok) throw new Error('Жаңарту мүмкін болмады.');
  const data = await res.json();
  return data.dream as DreamItem;
}

export async function deleteDream(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/dreams/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Өшіру мүмкін болмады.');
}
