// One random daily task per day — a small extra goal for the game of the day.
// Kept fully local (localStorage) so it never blocks or corrupts server
// progress; the reward is paid through the normal stardust counter.

import type { GameId } from '../components/gameTypes';

export interface DailyTaskDef {
  id: string;
  gameId: GameId;
  title: string; // shown on the intro/result screens
  metric: string; // key the game reports in its round metrics
  target: number; // reached when best >= target
  reward: number; // stardust paid once per day
}

// Exactly one task per game, so the daily rotation always has a fitting task.
export const DAILY_TASKS: DailyTaskDef[] = [
  { id: 'catch-score', gameId: 'catch', title: 'Жүрек аулау: 90 ұпай жина', metric: 'score', target: 90, reward: 7 },
  { id: 'memory-chain', gameId: 'memory', title: 'Жұбын тап: 3 дұрыс жұп қатарынан', metric: 'matchStreak', target: 3, reward: 7 },
  { id: 'reaction-fast', gameId: 'reaction', title: 'Дәл тап: 3 раунд 700 мс-ден тез', metric: 'fastRounds', target: 3, reward: 7 },
  { id: 'race-score', gameId: 'star-race', title: 'Жұлдызды жарыс: 60 ұпай жина', metric: 'score', target: 60, reward: 7 },
  { id: 'tower-perfect', gameId: 'love-tower', title: 'Мұнара: 3 Perfect Drop жаса', metric: 'perfects', target: 3, reward: 7 },
  { id: 'match3-combo', gameId: 'match3', title: 'Кристалдар: 3 каскад комбо жаса', metric: 'combos', target: 3, reward: 7 },
];

interface TaskState {
  date: string;
  taskId: string;
  best: number; // best value achieved for that task metric today
  claimed: boolean; // reward already paid for this day
}

const KEY = 'nashe_daily_task_v1';

// Deterministic pick: the day number divided over the task list, so both
// devices agree on the task without a server call.
export function getDailyTask(date: string): DailyTaskDef {
  const index = Math.abs(dayIndex(date)) % DAILY_TASKS.length;
  return DAILY_TASKS[index];
}

function dayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export interface TaskProgress {
  task: DailyTaskDef;
  best: number;
  claimed: boolean;
  done: boolean;
}

function readState(date: string, taskId: string): TaskState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TaskState;
      if (parsed.date === date && parsed.taskId === taskId) return parsed;
    }
  } catch {
    // fall through to a fresh day
  }
  return { date, taskId, best: 0, claimed: false };
}

export function getDailyTaskProgress(date: string): TaskProgress {
  const task = getDailyTask(date);
  const s = readState(date, task.id);
  return { task, best: s.best, claimed: s.claimed, done: s.best >= task.target || s.claimed };
}

// Report metrics from a finished round. Returns the task's current progress
// and — the ONE time per day it flips — `justCompleted` for the caller to pay
// the reward. Ignore when the reported game isn't today's task game.
export interface TaskCheck {
  task: DailyTaskDef;
  best: number;
  done: boolean;
  justCompleted: boolean;
}

export function reportTaskProgress(
  date: string,
  gameId: GameId,
  metrics: Record<string, number>
): TaskCheck {
  const task = getDailyTask(date);
  const state = readState(date, task.id);
  const viable = gameId === task.gameId && task.metric in metrics;
  const value = viable ? Math.max(0, Math.floor(metrics[task.metric])) : 0;
  const wasDone = state.best >= task.target || state.claimed;
  const best = Math.max(state.best, value);
  const done = best >= task.target;
  const justCompleted = done && !wasDone;
  if (best !== state.best) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, best }));
    } catch {
      // non-critical
    }
  }
  return { task, best, done, justCompleted };
}

// Marks the reward as paid (once per day, after App adds the stardust).
export function claimDailyTask(date: string): void {
  const task = getDailyTask(date);
  const state = readState(date, task.id);
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, claimed: true, best: Math.max(state.best, task.target) }));
  } catch {
    // non-critical
  }
}
