import React from 'react';
import { Flame, Shield, Sparkles, CalendarDays, Trophy, ShoppingBag } from 'lucide-react';
import { MILESTONE_BONUSES } from '../data/constants';
import { THEME_META } from '../data/themes';
import { getNextMilestone, MAX_SHIELDS } from '../utils/streakUtils';
import type { JointState } from '../utils/featureApi';

interface StreakProgressProps {
  streak: number;
  bestStreak: number;
  shields: number;
  stardust: number;
  // She missed a day, but her shield(s) will save the streak once she plays.
  shielded: boolean;
  earnedThemes: string[];
  joint: JointState | null;
  onOpenCalendar: () => void;
  onOpenShop: () => void;
}

// A compact card under the header: current streak, record, shields, stardust,
// how far the next theme is, and the "our streak" (both of us) status.
export const StreakProgress: React.FC<StreakProgressProps> = ({
  streak,
  bestStreak,
  shields,
  stardust,
  shielded,
  earnedThemes,
  joint,
  onOpenCalendar,
  onOpenShop,
}) => {
  const next = getNextMilestone(MILESTONE_BONUSES, streak, earnedThemes);
  // Bar runs from the previous step on the ladder (or 0) to the next one.
  const prevStep = MILESTONE_BONUSES.reduce((acc, m) => (m.streak <= streak ? Math.max(acc, m.streak) : acc), 0);
  const pct = next
    ? Math.min(100, Math.max(4, ((streak - prevStep) / (next.milestone.streak - prevStep)) * 100))
    : 100;
  const nextMeta = next ? THEME_META[next.milestone.theme] : null;

  return (
    <div className="w-full max-w-xl mx-auto px-4 mb-2">
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="text-sm font-bold text-[var(--text)]">{streak} күндік стрик</div>
              <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Рекорд: {Math.max(bestStreak, streak)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="flex items-center gap-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--text)]"
              title={`Жұлдыз қалқаны: ${shields} / ${MAX_SHIELDS}`}
            >
              <Shield className="w-3.5 h-3.5 text-[var(--accent-2)]" />
              {shields}/{MAX_SHIELDS}
            </span>
            <button
              onClick={onOpenShop}
              className="flex items-center gap-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)]/40 transition active:scale-95"
              title="Жұлдыз тозаңы — дүкен"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              {stardust}
            </button>
          </div>
        </div>

        {shielded && (
          <p className="mt-2 text-[11px] text-[var(--accent-2-dark)] bg-[var(--accent-2)]/10 border border-[var(--accent-2)]/25 rounded-xl px-2.5 py-1.5">
            🛡️ Бір күн өтіп кетті, бірақ қалқан стрикті қорғап тұр. Бүгін жұлдызды ал — стрик сақталады.
          </p>
        )}

        <div className="mt-2.5">
          {next && nextMeta ? (
            <>
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span className="flex items-center gap-1">
                  <nextMeta.icon className="w-3 h-3 text-[var(--accent)]" />
                  Келесі тема: <b className="text-[var(--text)] font-semibold">{nextMeta.label}</b>
                </span>
                <span>{next.daysLeft} күн қалды</span>
              </div>
              <div
                className="h-2 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={next.milestone.streak}
                aria-valuenow={streak}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">👑 Барлық темалар ашылды — моя умничка!</p>
          )}
        </div>

        {joint && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/20 px-2.5 py-1.5 text-[11px]">
            <span className="text-[var(--text)] font-semibold">
              💞 Біздің стрик: {joint.streak} күн
              {joint.best > 0 && <span className="text-[var(--text-muted)] font-normal"> · рекорд {joint.best}</span>}
            </span>
            <span className="text-[var(--text-muted)]">
              Ол бүгін: {joint.today.admin ? '✅' : '⏳'}
            </span>
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <button
            onClick={onOpenCalendar}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)]/40 transition active:scale-95"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
            Күнтізбе
          </button>
          <button
            onClick={onOpenShop}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)]/40 transition active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[var(--accent)]" />
            Жұлдыз дүкені
          </button>
        </div>
      </div>
    </div>
  );
};
