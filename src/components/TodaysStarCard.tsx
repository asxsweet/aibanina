import React from 'react';
import { Play, Shuffle, Star } from 'lucide-react';
import type { DifficultyName } from '../utils/constellationUtils';

const DIFFICULTY_LABELS: { id: DifficultyName; label: string }[] = [
  { id: 'easy', label: 'Жеңіл' },
  { id: 'medium', label: 'Орташа' },
  { id: 'hard', label: 'Қиын' },
];

interface TodaysStarCardProps {
  dayNumber: number;
  gameLabel: string;
  playedToday: boolean;
  difficulty: DifficultyName;
  onSetDifficulty: (d: DifficultyName) => void;
  onPlay: () => void;
  onChangeGame: () => void;
}

// The hero card of the home screen: today's glowing star in a ring, the game
// of the day, the difficulty segmented control, and one big gradient
// play button that leads to the game itself.
export const TodaysStarCard: React.FC<TodaysStarCardProps> = ({
  dayNumber,
  gameLabel,
  playedToday,
  difficulty,
  onSetDifficulty,
  onPlay,
  onChangeGame,
}) => (
  <section className="w-full max-w-xl mx-auto px-4 mt-3">
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm backdrop-blur-md">
      {/* Eyebrow */}
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--accent-2)]">
        <Star className="h-3 w-3 fill-[var(--accent-2)] text-[var(--accent-2)]" />
        Бүгінгі жұлдыз
        {playedToday && (
          <span className="ml-auto rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-0.5 text-[9px] tracking-normal text-[var(--text-muted)] normal-case">
            ✓ Бүгін алынды
          </span>
        )}
      </p>

      {/* Star badge + title + game chip */}
      <div className="mt-3 flex items-center gap-4">
        <div className="relative grid h-[76px] w-[76px] flex-shrink-0 place-items-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)' }}
          />
          <span className="absolute inset-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10" />
          <span className="absolute inset-3 rounded-full border border-dashed border-[var(--accent)]/35" />
          <Star className="relative h-8 w-8 text-[var(--accent)] fill-[var(--accent)]" strokeWidth={1.2} />
          <span className="absolute -bottom-0.5 rounded-full border border-[var(--accent)]/40 bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-bold text-[var(--text)]">
            {dayNumber}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-serif italic text-[22px] leading-tight text-[var(--text)]">
            {dayNumber} күндік жұлдыз күтуде
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            Бүгінгі ойын:
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-0.5 font-semibold text-[var(--text)]">
              {gameLabel}
            </span>
          </p>
        </div>
      </div>

      {/* Difficulty segmented control */}
      <div className="mt-4 grid grid-cols-3 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] p-1" role="group" aria-label="Қиындық">
        {DIFFICULTY_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onSetDifficulty(id)}
            aria-pressed={difficulty === id}
            className={`relative rounded-full py-1.5 text-xs font-bold transition active:scale-95 ${
              difficulty === id
                ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Big play button */}
      <button
        onClick={onPlay}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] py-3.5 text-sm font-bold text-[var(--on-accent)] shadow-[0_10px_28px_var(--accent-glow)] transition active:scale-[0.98]"
      >
        <Play className="h-4 w-4 fill-[var(--on-accent)]" />
        {playedToday ? 'Бонус ойнау · +10 тозаң' : 'Ойнап, жұлдызын ала'}
      </button>

      {/* Footer row: switch the game of the day */}
      <div className="mt-2.5 flex items-center justify-between px-1">
        <button
          onClick={onChangeGame}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)] transition hover:text-[var(--accent-dark)]"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Ойынды ауыстыру
        </button>
        {!playedToday && (
          <span className="text-[11px] text-[var(--text-faint)]">+10 ✦ тозаң</span>
        )}
      </div>
    </div>
  </section>
);
