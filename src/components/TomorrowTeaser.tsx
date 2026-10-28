import React from 'react';
import { Eye, MoonStar } from 'lucide-react';
import { maskTitle } from '../utils/streakUtils';

interface TomorrowTeaserProps {
  dayNumber: number;
  title: string;
  revealed: boolean;
  onOpenShop: () => void;
}

// "Tomorrow: С•• — м•••• ү•••" — a riddle that makes her want to come back.
// Spending stardust (in the shop) reveals the full title.
export const TomorrowTeaser: React.FC<TomorrowTeaserProps> = ({ dayNumber, title, revealed, onOpenShop }) => (
  <div className="w-full max-w-xl mx-auto px-4 mt-3 relative z-10">
    <div className="flex items-center gap-3 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-sm backdrop-blur-md">
      <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[var(--accent)]/10">
        <MoonStar className="h-4 w-4 text-[var(--accent)]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-2)]">
          Ертең · №{dayNumber} күн
        </div>
        <div className="truncate font-serif italic text-base text-[var(--text)]">
          «{revealed ? title : maskTitle(title)}»
        </div>
      </div>
      {!revealed && (
        <button
          onClick={onOpenShop}
          className="flex flex-shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)]/40 active:scale-95"
        >
          <Eye className="h-3.5 w-3.5 text-[var(--accent)]" />
          Сығалау
        </button>
      )}
    </div>
  </div>
);
