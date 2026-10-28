// Per-game-audio/visual settings, stored in localStorage and observable.
// A tiny pub/sub store keeps React hooks simple; the settings live apart from
// UserProgress on purpose — they are device-local preferences (muted phone,
// weak phone), not romantic progress to sync with the server.

import { useSyncExternalStore } from 'react';

export type GameQuality = 'auto' | 'high' | 'eco';

export interface GameSettings {
  music: boolean;
  sfx: boolean;
  vibrate: boolean;
  quality: GameQuality;
}

const STORAGE_KEY = 'nashe_game_prefs_v1';

const DEFAULT_SETTINGS: GameSettings = {
  music: false, // off by default — a quiet app is easier to love
  sfx: true,
  vibrate: true,
  quality: 'auto',
};

let state: GameSettings = load();
const listeners = new Set<() => void>();

function load(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      music: typeof parsed.music === 'boolean' ? parsed.music : DEFAULT_SETTINGS.music,
      sfx: typeof parsed.sfx === 'boolean' ? parsed.sfx : DEFAULT_SETTINGS.sfx,
      vibrate: typeof parsed.vibrate === 'boolean' ? parsed.vibrate : DEFAULT_SETTINGS.vibrate,
      quality: parsed.quality === 'high' || parsed.quality === 'eco' || parsed.quality === 'auto'
        ? parsed.quality
        : DEFAULT_SETTINGS.quality,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private mode — settings stay for this session only
  }
}

export function getGameSettings(): GameSettings {
  return state;
}

export function updateGameSettings(patch: Partial<GameSettings>): void {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useGameSettings(): GameSettings {
  return useSyncExternalStore(subscribe, getGameSettings, getGameSettings);
}

// --- auto quality heuristic -------------------------------------------------
// Picks "eco" for weak devices so animations stay smooth. `prefers-reduced-motion`
// also forces the light flight: heavy motion is a blocker for some users.
export let prefersReducedMotion = false;

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion = mq.matches;
  mq.addEventListener?.('change', (e) => {
    prefersReducedMotion = e.matches;
  });
}

export function detectAutoQuality(): 'high' | 'eco' {
  if (typeof navigator === 'undefined') return 'high';
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } | null };
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  const weakCpu = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 3;
  const badNetwork = nav.connection?.saveData === true;
  return lowMemory || weakCpu || badNetwork ? 'eco' : 'high';
}

// Resolved quality actually used by games ('auto' resolves now, so games never
// re-flow mid-round for no reason).
export function resolveQuality(quality: GameQuality): 'high' | 'eco' {
  if (quality === 'auto') return detectAutoQuality();
  return quality;
}
