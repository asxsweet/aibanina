// Client side of the record system.
//
// A finished round becomes a RoundPayload with a unique roundId. The server
// dedupes by roundId (a flaky connection can never double-count a round) and
// validates every field against a whitelist. If the phone is offline, the
// round sits in a local queue and is flushed exactly once when the connection
// is back — order is irrelevant because each round is uniquely identified.

import { API_BASE } from './apiClient';

export type GameMetric = 'time' | 'score';
export type RoundOutcome = 'win' | 'loss' | 'quit';

export interface RoundPayload {
  roundId: string;
  gameId: string;
  difficulty: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  metric: GameMetric;
  metricValue: number; // the comparable value (score, or ms for time games)
  scoreValue: number; // display score
  moves: number;
  result: RoundOutcome;
}

export interface RivalInfo {
  name: string;
  bestValue: number;
  metric: GameMetric;
}

export interface RoundResponse {
  accepted: boolean;
  duplicate?: boolean;
  metric: GameMetric;
  bestValue: number;
  previousBest: number | null;
  isRecord: boolean;
  rival: RivalInfo | null;
  personal?: {
    plays: number;
    todayCount: number;
    weekCount: number;
  };
}

const QUEUE_KEY = 'nashe_game_round_queue_v1';
const SENT_KEY = 'nashe_game_round_sent_v1';

export function newRoundId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readQueue(): RoundPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(list: RoundPayload[]): void {
  try {
    // Keep the queue small — if the phone was offline for weeks, the oldest
    // runs are still sent first on the next flush.
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    // private mode — round is just lost, non-critical
  }
}

function markSent(roundId: string): void {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    set.push(roundId);
    localStorage.setItem(SENT_KEY, JSON.stringify(set.slice(-500)));
  } catch {
    // not fatal
  }
}

function wasSent(roundId: string): boolean {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    return set.includes(roundId);
  } catch {
    return false;
  }
}

async function postRound(payload: RoundPayload): Promise<{ ok: boolean; status: number; data: RoundResponse | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data: RoundResponse | null = null;
    try {
      data = (await res.json()) as RoundResponse;
    } catch {
      // non-JSON body
    }
    return { ok: res.ok, status: res.status, data: res.ok ? data : null };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function postRoundOnce(payload: RoundPayload): Promise<RoundResponse | null> {
  if (wasSent(payload.roundId)) return null;
  const { ok, status, data } = await postRound(payload);
  if (!ok && (status === 0 || status >= 500)) {
    // Network unreachable OR a cold-starting server (5xx): queue and pretend
    // it went out — the flusher will make it right once things are back.
    const queue = readQueue().filter((r) => r.roundId !== payload.roundId);
    queue.push(payload);
    writeQueue(queue);
    return null;
  }
  markSent(payload.roundId);
  void dropFromQueue(payload.roundId);
  return data;
}

async function dropFromQueue(roundId: string): Promise<void> {
  const queue = readQueue();
  if (!queue.length) return;
  writeQueue(queue.filter((r) => r.roundId !== roundId));
}

let flushInstalled = false;
// Installs online/visibility flush listeners for the offline queue. Call from
// the app entry point (GameHub) once per session.
export function installRoundQueueFlusher(): void {
  if (flushInstalled || typeof window === 'undefined') return;
  flushInstalled = true;
  const flush = async () => {
    const queue = readQueue();
    for (const item of queue) {
      if (wasSent(item.roundId)) {
        void dropFromQueue(item.roundId);
        continue;
      }
      const res = await postRound(item);
      if (res.ok) {
        markSent(item.roundId);
        await dropFromQueue(item.roundId);
      } else if (res.status === 401 || res.status === 400 || res.status === 422) {
        // Rejected for a structural reason: resending forever cannot fix it.
        markSent(item.roundId);
        await dropFromQueue(item.roundId);
      } else {
        break; // server unreachable again — try later
      }
    }
  };
  window.addEventListener('online', () => void flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush();
  });
}

// ------------------------------------------------------------------ summary

// Pre-round read of "my best" and "partner's best" for one game/difficulty.
// Used by the intro screens (and the star-race ghost ship); never critical —
// failures just mean no record lines are shown.
export interface RoundSummary {
  gameId: string;
  difficulty: string;
  metric: GameMetric;
  best: number | null;
  plays: number;
  updatedAt: number | null;
  rival: RivalInfo | null;
}

export async function fetchRoundSummary(gameId: string, difficulty: string): Promise<RoundSummary | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/rounds/summary?gameId=${encodeURIComponent(gameId)}&difficulty=${encodeURIComponent(difficulty)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { summary: RoundSummary };
    return data.summary ?? null;
  } catch {
    return null;
  }
}
