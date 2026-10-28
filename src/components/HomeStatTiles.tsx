import React from 'react';
import { Flame, Star, Sparkles } from 'lucide-react';

interface HomeStatTilesProps {
  streak: number;
  stars: number; // daysPlayed
  stardust: number;
  onOpenCalendar: () => void;
  onOpenRules: () => void;
  onOpenShop: () => void;
}

// The three little stat tiles under the greeting: streak · stars · stardust.
// Tap targets: streak → calendar, stars → the star rules, stardust → the shop.
export const HomeStatTiles: React.FC<HomeStatTilesProps> = ({
  streak,
  stars,
  stardust,
  onOpenCalendar,
  onOpenRules,
  onOpenShop,
}) => (
  <div className="w-full max-w-xl mx-auto px-4">
    <div className="grid grid-cols-3 gap-2.5">
      <button
        onClick={onOpenCalendar}
        className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left backdrop-blur-md shadow-sm transition hover:border-[var(--accent)]/40 active:scale-[0.97]"
        title="Күнделікті стрик — күнтізбе"
      >
        <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)]/12">
          <Flame className="h-3.5 w-3.5 text-[var(--accent)]" />
        </span>
        <span className="flex items-baseline gap-1 leading-none">
          <span className="text-xl font-bold text-[var(--text)]">{streak}</span>
          <span className="text-[10px] font-medium text-[var(--text-muted)]">күн</span>
        </span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Стрик
        </span>
      </button>

      <button
        onClick={onOpenRules}
        className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left backdrop-blur-md shadow-sm transition hover:border-[var(--accent)]/40 active:scale-[0.97]"
        title="Жиналған жұлдыздар"
      >
        <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)]/12">
          <Star className="h-3.5 w-3.5 text-[var(--accent)] fill-[var(--accent)]/40" />
        </span>
        <span className="text-xl font-bold leading-none text-[var(--text)]">{stars}</span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Жұлдыз
        </span>
      </button>

      <button
        onClick={onOpenShop}
        className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left backdrop-blur-md shadow-sm transition hover:border-[var(--accent)]/40 active:scale-[0.97]"
        title="Жұлдыз тозаңы — дүкен"
      >
        <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)]/12">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
        </span>
        <span className="text-xl font-bold leading-none text-[var(--text)]">{stardust}</span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Тозаң
        </span>
      </button>
    </div>
  </div>
);
