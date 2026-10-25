import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { buildMonthGrid, CalendarDayState, KK_MONTHS, KK_WEEKDAYS_SHORT } from '../utils/streakUtils';

interface StreakCalendarModalProps {
  today: string; // YYYY-MM-DD
  playedDates: string[];
  shieldDates: string[];
  daysPlayed: number;
  streak: number;
  bestStreak: number;
  onClose: () => void;
}

const CELL_STYLE: Record<CalendarDayState, string> = {
  played: 'bg-[var(--accent)] text-[var(--on-accent)] font-bold',
  shield: 'bg-[var(--accent-2)]/15 border border-[var(--accent-2)] text-[var(--accent-2-dark)] font-semibold',
  missed: 'bg-[var(--bg-soft)] text-[var(--text-faint)]',
  pending: 'ring-2 ring-[var(--accent)] text-[var(--accent)] font-bold',
  future: 'text-[var(--text-faint)]/50',
  before: 'text-[var(--text-faint)]/50',
};

const CELL_TITLE: Record<CalendarDayState, string> = {
  played: 'Жұлдыз алынды',
  shield: 'Қалқан стрикті сақтады',
  missed: 'Өткізілген күн',
  pending: 'Бүгін — жұлдыз күтіп тұр',
  future: '',
  before: '',
};

export const StreakCalendarModal: React.FC<StreakCalendarModalProps> = ({
  today,
  playedDates,
  shieldDates,
  daysPlayed,
  streak,
  bestStreak,
  onClose,
}) => {
  const [ty, tm] = today.split('-').map(Number);
  const [view, setView] = useState({ year: ty, month0: tm - 1 });

  // Don't let her page back further than the month of her very first star.
  const firstActive = useMemo(() => [...playedDates, ...shieldDates].sort()[0] || today, [playedDates, shieldDates, today]);
  const [fy, fm] = firstActive.split('-').map(Number);
  const atFirst = view.year < fy || (view.year === fy && view.month0 <= fm - 1);
  const atCurrent = view.year > ty || (view.year === ty && view.month0 >= tm - 1);

  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month0, playedDates, shieldDates, today),
    [view.year, view.month0, playedDates, shieldDates, today]
  );

  const step = (delta: number) => {
    setView((v) => {
      const idx = v.year * 12 + v.month0 + delta;
      return { year: Math.floor(idx / 12), month0: idx % 12 };
    });
  };

  return (
    <ModalShell title="Күнтізбе" icon={<CalendarDays className="w-5 h-5 text-[var(--accent)]" />} onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => step(-1)}
          disabled={atFirst}
          className="p-1.5 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30"
          aria-label="Алдыңғы ай"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-semibold text-[var(--text)]">
          {KK_MONTHS[view.month0]} {view.year}
        </div>
        <button
          onClick={() => step(1)}
          disabled={atCurrent}
          className="p-1.5 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30"
          aria-label="Келесі ай"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {KK_WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, i) =>
          cell ? (
            <div
              key={cell.date}
              title={CELL_TITLE[cell.state] || undefined}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs ${CELL_STYLE[cell.state]}`}
            >
              <span>{cell.day}</span>
              {cell.state === 'shield' && <span className="text-[8px] leading-none">🛡️</span>}
            </div>
          ) : (
            <div key={`empty-${i}`} />
          )
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded bg-[var(--accent)]" />Жұлдыз алынды</span>
        <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded border border-[var(--accent-2)] bg-[var(--accent-2)]/15" />Қалқан</span>
        <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded bg-[var(--bg-soft)] border border-[var(--border)]" />Өткізілген</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Жұлдыздар', value: daysPlayed },
          { label: 'Стрик', value: streak },
          { label: 'Рекорд', value: Math.max(bestStreak, streak) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] py-2">
            <div className="text-lg font-bold text-[var(--text)]">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--accent-2)] font-semibold">{s.label}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
};
