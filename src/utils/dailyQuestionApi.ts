// Client for the daily-question answer endpoints, with a small offline
// queue: while the server is unreachable the answer waits in localStorage
// and is sent exactly once when the connection returns. The queue is
// deduped per (dayNumber, questionId), so flushing never duplicates an
// answer — the server additionally dedupes with a unique index.
//
// "Сақталды" is only ever claimed after the server has really accepted it.

import { API_BASE } from './apiClient';
import { getTodayDateString } from './constellationUtils';
import type { DailyQuestionAnswer } from '../types';

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  networkError?: boolean;
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
    return {
      ok: res.ok,
      status: res.status,
      data: res.ok ? (data as T) : null,
      error: res.ok ? undefined : data?.error,
    };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Серверге қосыла алмадым.', networkError: true };
  }
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// ------------------------------------------------------------- offline queue

interface QueuedAnswer {
  dayNumber: number;
  questionId: string;
  question: string;
  answer: string;
  date: string;
}

const QUEUE_KEY = 'nashe_daily_question_queue_v1';

function readQueue(): QueuedAnswer[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueuedAnswer[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAnswer[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // storage unavailable — the answer just can't be queued offline
  }
}

export function getPendingAnswerCount(): number {
  return readQueue().length;
}

function enqueue(item: QueuedAnswer): void {
  const queue = readQueue().filter(
    (q) => !(q.dayNumber === item.dayNumber && q.questionId === item.questionId)
  );
  queue.push(item);
  writeQueue(queue.slice(-25));
}

// Sends every queued answer once the server is back. Returns how many were
// uploaded; failing entries stay queued for the next attempt.
export async function flushPendingAnswers(): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;
  let sent = 0;
  const remaining: QueuedAnswer[] = [];
  for (const item of queue) {
    const r = await api<{ success: boolean }>('/api/daily-question/answer', json('POST', item));
    if (r.ok) sent += 1;
    else if (r.networkError) remaining.push(item); // keep for later
    // A definite server-side rejection (400/403/…) means this queue entry is
    // invalid — never retry it, drop it.
  }
  if (sent < queue.length) writeQueue(remaining);
  else writeQueue([]);
  return sent;
}

// Self-installing: flushes on `online` and on app start. Safe to call again.
let installed = false;
export function installDailyQuestionFlush(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const attempt = () => {
    flushPendingAnswers().catch(() => undefined);
  };
  window.addEventListener('online', attempt);
  // A server woken by the first progress sync may still catch late answers.
  setTimeout(attempt, 15000);
  setTimeout(attempt, 60000);
}

// ---------------------------------------------------------------- endpoints

export async function fetchDayAnswer(dayNumber: number): Promise<DailyQuestionAnswer | null> {
  const r = await api<{ answer: DailyQuestionAnswer | null }>(`/api/daily-question/day/${dayNumber}`);
  return r.data?.answer ?? null;
}

export async function fetchMyAnswers(): Promise<DailyQuestionAnswer[]> {
  const r = await api<{ answers: DailyQuestionAnswer[] }>('/api/daily-question/mine');
  return r.data?.answers ?? [];
}

export interface SaveAnswerResult {
  ok: boolean;
  savedOnServer: boolean; // true only when the server really accepted it
  queuedOffline: boolean;
  error?: string;
}

export async function saveQuestionAnswer(params: {
  dayNumber: number;
  questionId: string;
  question: string;
  answer: string;
}): Promise<SaveAnswerResult> {
  const answer = params.answer.trim();
  const body = {
    dayNumber: params.dayNumber,
    questionId: params.questionId,
    answer,
    date: getTodayDateString(),
  };
  const r = await api<{ success: boolean }>('/api/daily-question/answer', json('POST', body));
  if (r.ok) return { ok: true, savedOnServer: true, queuedOffline: false };

  if (r.networkError) {
    // Offline: queue locally and tell the user honestly that it will be
    // sent later — never claim "saved" before the server has it.
    enqueue({
      dayNumber: params.dayNumber,
      questionId: params.questionId,
      question: params.question,
      answer,
      date: body.date,
    });
    return {
      ok: true,
      savedOnServer: false,
      queuedOffline: true,
      error: 'Интернет жоқ. Жауабың сақталды және байланыс орнағанда жіберіледі.',
    };
  }
  return { ok: false, savedOnServer: false, queuedOffline: false, error: r.error || 'Жауапты сақтау мүмкін болмады.' };
}

// -------------------------------------------------------------------- admin

export interface AdminAnswerRow {
  id: string;
  userId: string;
  userName: string;
  dayNumber: number;
  date: string;
  questionId: string;
  question: string;
  answer: string;
  createdAt: number;
  updatedAt: number;
}

export interface AdminAnswersPage {
  answers: AdminAnswerRow[];
  total: number;
  page: number;
  limit: number;
}

export async function adminFetchAnswers(filters: {
  page?: number;
  limit?: number;
  dayNumber?: number | null;
  userId?: string;
  questionId?: string;
}): Promise<AdminAnswersPage> {
  const qs = new URLSearchParams();
  if (filters.page) qs.set('page', String(filters.page));
  if (filters.limit) qs.set('limit', String(filters.limit));
  if (filters.dayNumber) qs.set('dayNumber', String(filters.dayNumber));
  if (filters.userId?.trim()) qs.set('userId', filters.userId.trim());
  if (filters.questionId?.trim()) qs.set('questionId', filters.questionId.trim());
  const r = await api<AdminAnswersPage>(`/api/admin/daily-question-answers?${qs.toString()}`);
  if (!r.data) throw new Error(r.error || 'Жауаптарды оқу мүмкін болмады.');
  return r.data;
}

export async function adminDeleteAnswer(id: string): Promise<void> {
  const r = await api(`/api/admin/daily-question-answers/${encodeURIComponent(id)}`, json('DELETE'));
  if (!r.ok) throw new Error(r.error || 'Жауапты жою мүмкін болмады.');
}
