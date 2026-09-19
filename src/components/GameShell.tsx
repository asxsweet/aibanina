import React from 'react';
import { Sparkles, RotateCcw, Play, CheckCircle2 } from 'lucide-react';
import { DifficultyName } from '../utils/constellationUtils';

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

const DIFFICULTY_LABELS: Record<DifficultyName, string> = {
  easy: 'Жеңіл',
  medium: 'Орташа',
  hard: 'Қиын',
};

interface GameShellProps {
  gameStatus: GameStatus;
  isBonusMode: boolean;
  playedToday: boolean;
  score: number;
  targetScore: number;
  hudLabel: string; // small label under the score, e.g. game name
  hudRight?: React.ReactNode; // optional right-side HUD element (lives, timer, etc.)
  missionTitle: string;
  missionText: string;
  lostTitle: string;
  lostText: string;
  wonBonusText: string;
  difficulty: DifficultyName;
  onSetDifficulty?: (difficulty: DifficultyName) => void;
  onStart: (bonus: boolean) => void;
  children?: React.ReactNode; // the actual play area, shown while gameStatus === 'playing'
  heightClass?: string;
}

export const GameShell: React.FC<GameShellProps> = ({
  gameStatus,
  isBonusMode,
  playedToday,
  score,
  targetScore,
  hudLabel,
  hudRight,
  missionTitle,
  missionText,
  lostTitle,
  lostText,
  wonBonusText,
  difficulty,
  onSetDifficulty,
  onStart,
  children,
  heightClass = 'h-[330px]',
}) => {
  const DifficultySwitcher = onSetDifficulty ? (
    <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] mt-1">
      {(['easy', 'medium', 'hard'] as DifficultyName[]).map((key) => (
        <button
          key={key}
          onClick={() => onSetDifficulty(key)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
            difficulty === key
              ? 'bg-[var(--accent)] text-[var(--on-accent)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          {DIFFICULTY_LABELS[key]}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div
      className={`relative w-full ${heightClass} rounded-[32px] sm:rounded-[40px] bg-[var(--bg-card)] border border-[var(--accent)]/20 backdrop-blur-xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden select-none flex flex-col justify-between`}
    >
      {/* Top HUD bar during game */}
      <div className="p-3.5 flex items-center justify-between text-xs font-medium z-10 bg-[var(--bg-soft)]/70 backdrop-blur-md border-b border-[var(--border)]">
        <div className="font-semibold text-sm text-[var(--text)]">
          {score} / {targetScore}
        </div>
        <div className="text-[var(--accent)] text-[11px] font-serif tracking-wider uppercase">
          {isBonusMode ? 'Бонустық ойын' : hudLabel} · {DIFFICULTY_LABELS[difficulty]}
        </div>
        <div className="flex items-center gap-1 text-[var(--accent)]">{hudRight}</div>
      </div>

      {/* Play area */}
      {gameStatus === 'playing' && (
        <div className="relative w-full h-full overflow-hidden">{children}</div>
      )}

      {/* Overlay states */}
      {gameStatus !== 'playing' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-elevated)]/92 backdrop-blur-xl">
          {gameStatus === 'idle' && playedToday && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-2)]/15 border border-[var(--accent-2)]/35 flex items-center justify-center text-[var(--accent-2)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="font-serif text-2xl font-light italic text-[var(--accent)]">
                Бүгінгі жұлдыздар алынды!
              </h2>
              <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed font-light">
                Бүгін марапатты алып қойдың. Жаңа жұлдыз үшін ертең кел —Жұлдыздар сені күтеді.
              </p>
              {DifficultySwitcher}
              <button
                onClick={() => onStart(true)}
                className="mt-2 px-6 py-3 rounded-2xl btn-gold text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Жай ғана тағы ойнау</span>
              </button>
            </div>
          )}

          {gameStatus === 'idle' && !playedToday && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/35 flex items-center justify-center text-[var(--accent)] animate-pulse-glow">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="text-[10px] uppercase font-bold text-[var(--accent-2)] tracking-widest">
                {hudLabel}
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-light italic text-[var(--accent)]">
                {missionTitle}
              </h2>
              <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed font-light">
                {missionText}
              </p>
              {DifficultySwitcher}
              <button
                onClick={() => onStart(false)}
                className="mt-2 px-7 py-3.5 rounded-2xl btn-gold text-sm flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-[var(--on-accent)]" />
                <span>Ойынды бастау</span>
              </button>
            </div>
          )}

          {gameStatus === 'lost' && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl mb-1">🥺</div>
              <h2 className="font-serif text-xl font-light italic text-[var(--accent-2)]">
                {lostTitle}
              </h2>
              <p className="text-xs text-[var(--text-muted)] max-w-xs font-light">{lostText}</p>
              <button
                onClick={() => onStart(isBonusMode)}
                className="mt-2 px-6 py-3 rounded-2xl btn-gold text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Қайта байқау</span>
              </button>
            </div>
          )}

          {gameStatus === 'won' && isBonusMode && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl mb-1">✨</div>
              <h2 className="font-serif text-2xl font-light italic text-[var(--accent)]">
                Тамаша ойын!
              </h2>
              <p className="text-xs text-[var(--text-muted)] max-w-xs font-light">{wonBonusText}</p>
              <button
                onClick={() => onStart(true)}
                className="mt-2 px-6 py-3 rounded-2xl btn-gold text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Тағы ойнау</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
