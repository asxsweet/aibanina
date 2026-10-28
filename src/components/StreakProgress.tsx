import React from 'react';
import { Flame, Shield, Trophy, Heart, Star, CalendarDays } from 'lucide-react';
import { MILESTONE_BONUSES } from '../data/constants';
import { THEME_META } from '../data/themes';
import { getNextMilestone, MAX_SHIELDS } from '../utils/streakUtils';
import { getTodayDateString } from '../utils/constellationUtils';
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
  /** claimed dates of this run (YYYY-MM-DD) — fills this week's star circles */
  playedDates?: string[];
}

// Monday-first short labels, getDay() order (0 = Sunday → last).
const WEEK_LABELS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жк'];

// The compact "12 күндік стрик" card: record + shields, this week's star
// circles (➕ = today still open), the race to the next theme, and the
// "our streak" line.
export const StreakProgress: React.FC<StreakProgressProps> = ({
  streak,
  bestStreak,
  shields,
  shielded,
  earnedThemes,
  joint,
  onOpenCalendar,
  onOpenShop,
  playedDates,
}) => {
  const next = getNextMilestone(MILESTONE_BONUSES, streak, earnedThemes);
  // Bar runs from the previous step on the ladder (or 0) to the next one.
  const prevStep = MILESTONE_BONUSES.reduce((acc, m) => (m.streak <= streak ? Math.max(acc, m.streak) : acc), 0);
  const pct = next
    ? Math.min(100, Math.max(6, ((streak - prevStep) / (next.milestone.streak - prevStep)) * 100))
    : 100;
  const nextMeta = next ? THEME_META[next.milestone.theme] : null;

  // Current week, Monday-first. Dates formatted exactly like
  // getTodayDateString() (local, zero-padded) so playedDates match.
  const todayStr = getTodayDateString();
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // 0 = Monday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - mondayOffset + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, label: WEEK_LABELS[i], done: !!playedDates?.includes(iso) };
  });
  const weekDone = days.filter((d) => d.done).length;

  return (
    <div className="w-full max-w-xl mx-auto px-4 mt-3">
      <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm backdrop-blur-md">
        {/* Header: streak + record + shields */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[var(--accent)]/12">
              <Flame className="h-4 w-4 text-[var(--accent)]" />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-bold text-[var(--text)]">
                {streak} күндік стрик
                <span className="ml-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                  <Trophy className="mr-0.5 -mt-0.5 inline h-3 w-3" />
                  Рекорд: {Math.max(bestStreak, streak)}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Осы аптада: {weekDone}/7</div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              onClick={onOpenCalendar}
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--accent)] transition hover:border-[var(--accent)]/40 active:scale-95"
              title="Күнделікті стрик — күнтізбе"
              aria-label="Күнтізбе"
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
            <span
              className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text)]"
              title={`Жұлдыз қалқаны: ${shields} / ${MAX_SHIELDS}`}
            >
              <Shield className="h-3.5 w-3.5 text-[var(--accent-2)]" />
              {shields}/{MAX_SHIELDS}
            </span>
          </div>
        </div>

        {shielded && (
          <p className="mt-2.5 rounded-2xl border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-3 py-1.5 text-[11px] text-[var(--accent-2-dark)]">
            🛡️ Бір күн өтіп кетті, бірақ қалқан стрикті қорғап тұр. Бүгін жұлдызды ал — стрик сақталады.
          </p>
        )}

        {/* Week strip: filled star = played, letter = waiting, ring = today */}
        <div className="mt-3.5 flex items-start justify-between" role="group" aria-label="Осы аптаның жұлдыздары">
          {days.map((d, i) => {
            const isToday = d.iso === todayStr;
            return (
              <span key={d.iso} className="flex flex-col items-center gap-1.5">
                <span
                  key={d.iso}
                  data-weekday
                  className={`grid h-9 w-9 place-items-center rounded-full border text-[10px] font-bold transition ${
                    d.done
                      ? 'border-transparent bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_4px_14px_var(--accent-glow)]'
                      : isToday
                        ? 'border-dashed border-[var(--accent)]/60 bg-[var(--bg-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-faint)]'
                  }`}
                  title={d.iso}
                >
                  {d.done ? <Star className="h-3.5 w-3.5 fill-[var(--on-accent)]" /> : isToday ? <Star className="h-3.5 w-3.5 text-[var(--accent)]" /> : ''}
                </span>
                <span className={`text-[9px] ${isToday ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}>
                  {WEEK_LABELS[i]}
                </span>
              </span>
            );
          })}
        </div>

        {/* Race to the next theme */}
        <div className="mt-3">
          {next && nextMeta ? (
            <>
              <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>
                  <nextMeta.icon className="-mt-0.5 mr-1 inline h-3 w-3 text-[var(--accent)]" />
                  Келесі тема: <b className="font-semibold text-[var(--text)]">{nextMeta.label}</b>
                </span>
                <span>{next.daysLeft} күн қалды</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-soft)]"
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
            <p className="text-[11px] text-[var(--text-muted)]">👑 Барлық темалар ашылды — сен аңызсың!</p>
          )}
        </div>

        {/* Our streak */}
        {joint && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-2 text-[11px]">
            <span className="font-semibold text-[var(--text)]">
              💞 Біздің стрик: {joint.streak} күн
              {joint.best > 0 && (
                <span className="font-normal text-[var(--text-muted)]"> · рекорд {joint.best}</span>
              )}
            </span>
            <span className="text-[var(--text-muted)]">Ол бүгін: {joint.today.admin ? '✅' : '⏳'}</span>
          </div>
        )}

        {/* Shop shortcut kept as a quiet link (stardust lives in the tiles above) */}
        <button
          onClick={onOpenShop}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] py-2 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)]/40 active:scale-[0.98]"
        >
          <Heart className="h-3.5 w-3.5 text-[var(--accent-2)]" />
          Жұлдыз дүкені
        </button>
      </div>
    </div>
  );
};
