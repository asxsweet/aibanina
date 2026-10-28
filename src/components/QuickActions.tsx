import React from 'react';
import {
  CalendarDays, Sparkles, Trophy, Mail, ListChecks, Heart,
} from 'lucide-react';

interface QuickActionsProps {
  onOpenCalendar: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenCapsules: () => void;
  onOpenDreams: () => void;
  onOpenIdeas: () => void;
}

// "Жылдам әрекеттер" — the 2×3 grid of little glass tiles that opens the
// calendar / shop / leaderboard / letters / dreams / warm-corner modals.
export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenCalendar,
  onOpenShop,
  onOpenLeaderboard,
  onOpenCapsules,
  onOpenDreams,
  onOpenIdeas,
}) => {
  const items: { label: string; icon: React.ElementType; action: () => void }[] = [
    { label: 'Күнтізбе', icon: CalendarDays, action: onOpenCalendar },
    { label: 'Жұлдыз дүкені', icon: Sparkles, action: onOpenShop },
    { label: 'Жарыс', icon: Trophy, action: onOpenLeaderboard },
    { label: 'Хаттар', icon: Mail, action: onOpenCapsules },
    { label: 'Армандар', icon: ListChecks, action: onOpenDreams },
    { label: 'Жылы бұрыш', icon: Heart, action: onOpenIdeas },
  ];

  return (
    <section className="w-full max-w-xl mx-auto px-4 mt-5">
      <h2 className="mb-2.5 pl-1 font-serif italic text-lg text-[var(--accent)]">Жылдам әрекеттер</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-2 rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] px-2 py-4 text-center shadow-sm backdrop-blur-md transition hover:border-[var(--accent)]/40 active:scale-[0.97]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent)]/12">
              <Icon className="h-4.5 w-4.5 text-[var(--accent)]" />
            </span>
            <span className="text-[11px] font-semibold text-[var(--text)]">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
