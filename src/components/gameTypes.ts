// Shared game identity types. Kept in one tiny file so utils (daily tasks)
// can reference a game without importing the whole GameHub component.

import type { DifficultyName, ThemeName } from '../utils/constellationUtils';

export type GameId = 'catch' | 'memory' | 'reaction' | 'star-race' | 'love-tower' | 'match3';

export type GamePhase = 'idle' | 'countdown' | 'playing' | 'paused' | 'over';
export type GameOutcome = 'win' | 'loss';

// Free-form per-round numbers a game may report (daily tasks read a key
// from here, e.g. "score", "perfects", "combos").
export type RoundMetrics = Record<string, number>;

// One difficulty preset shared by every game.
export interface DifficultyPreset {
  label: string;
  // game-time seconds / card counts / speeds etc. live per game; only the
  // label is shared
}

export interface HudLives {
  max: number;
  current: number;
}

export interface ResultLine {
  text: string;
  highlight?: boolean;
}

// The one props contract every rewritten game component (CatchGame.tsx etc.)
// accepts — GameHub passes exactly this to all six.
export interface GameComponentProps {
  theme: ThemeName;
  difficulty: DifficultyName;
  onSetDifficulty?: (d: DifficultyName) => void;
  /** Daily star already claimed today → the round is a bonus replay. */
  playedToday: boolean;
  /** "Сенікі: … · Серіктес: …" line for the idle screen (GameHub builds it). */
  recordsLine?: string | null;
  /** Daily-task status line for the idle screen. */
  taskLine?: string | null;
  /** Reward note shown inside the result window. */
  rewardNote?: string | null;
  onRoundEnd: (info: { outcome: GameOutcome; bonus: boolean; metrics: RoundMetrics }) => void;
  onAnotherGame: () => void;
  onOpenLeaderboard: () => void;
  onHome: () => void;
}

// What the unified result window can show once the round is recorded.
export interface GameResultView {
  outcome: GameOutcome;
  // headline value, already formatted ("1 260 ұпай", "2.8 с", "540 мс")
  headline: string;
  headlineLabel: string;
  isNewRecord: boolean;
  previousBest: string | null;
  rivalBest: string | null;
  gap: string | null; // "Сен 120 ұпайға алдасың" / "Сен 0.4 с ұтылдың"
  stats: { label: string; value: string }[];
  pendingSync: boolean; // round queued offline — will be sent later
}
