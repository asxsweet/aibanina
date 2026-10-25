import { StoryStage, StoryStatus } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Background music is stored as a base64 data URL on StoryStatus, same
// pattern as photos/videos elsewhere in this app — capped well under
// MongoDB's 16MB document limit even after the ~33% base64 overhead.
export const MAX_AUDIO_FILE_BYTES = 8 * 1024 * 1024; // 8MB raw audio

export function readAudioFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_AUDIO_FILE_BYTES) {
      reject(new Error('Музыка файлы тым үлкен (максимум 8МБ).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Файлды оқу мүмкін болмады.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export async function fetchStoryStages(): Promise<StoryStage[]> {
  const res = await fetch(`${API_BASE}/api/story/stages`);
  if (!res.ok) throw new Error('Тарихты жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.stages || []) as StoryStage[];
}

export interface StoryStageUpdate {
  title?: string;
  text?: string;
  photoUrl?: string | null;
}

export async function updateStoryStage(key: string, update: StoryStageUpdate): Promise<StoryStage> {
  const res = await fetch(`${API_BASE}/api/story/stages/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Кезеңді сақтау мүмкін болмады.');
  const data = await res.json();
  return data.stage as StoryStage;
}

export async function fetchStoryStatus(): Promise<StoryStatus> {
  const res = await fetch(`${API_BASE}/api/story/status`);
  if (!res.ok) throw new Error('Күйді жүктеу мүмкін болмады.');
  const data = await res.json();
  return data.status as StoryStatus;
}

// She says yes — one-way from her side.
export async function answerStory(dodgeCount: number): Promise<StoryStatus> {
  const res = await fetch(`${API_BASE}/api/story/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dodgeCount }),
  });
  if (!res.ok) throw new Error('Жауапты жіберу мүмкін болмады.');
  const data = await res.json();
  return data.status as StoryStatus;
}

// Admin-only: reset the answer (to replay the question together later)
// and/or change the background music.
export async function updateStoryStatus(update: { answered?: boolean; musicUrl?: string | null }): Promise<StoryStatus> {
  const res = await fetch(`${API_BASE}/api/story/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Сақтау мүмкін болмады.');
  const data = await res.json();
  return data.status as StoryStatus;
}
