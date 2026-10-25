import React from 'react';
import { Eye } from 'lucide-react';
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
  <div className="w-full max-w-lg mx-auto px-4 mt-3 relative z-10">
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--bg-card)] border border-dashed border-[var(--border)] px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-2)] font-semibold">
          Ертеңгі жұлдыз · №{dayNumber}
        </div>
        <div className="font-serif italic text-base text-[var(--text)] truncate">
          «{revealed ? title : maskTitle(title)}»
        </div>
      </div>
      {!revealed && (
        <button
          onClick={onOpenShop}
          className="flex-shrink-0 flex items-center gap-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)]/40 transition active:scale-95"
        >
          <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
          Сығалау
        </button>
      )}
    </div>
  </div>
);
