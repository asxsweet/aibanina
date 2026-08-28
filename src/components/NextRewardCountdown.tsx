import React, { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';

interface NextRewardCountdownProps {
  // Only shown once today's star has already been claimed — otherwise
  // there's nothing to count down to yet.
  visible: boolean;
}

// Progress resets at local midnight (see getTodayDateString / isSameDay in
// constellationUtils, both keyed off the browser's local date) — so that's
// exactly the moment the next star becomes available.
function getMsUntilNextMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - now.getTime());
}

function splitDuration(ms: number): { hours: string; minutes: string; seconds: string } {
  const totalSeconds = Math.floor(ms / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    hours: pad(Math.floor(totalSeconds / 3600)),
    minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
    seconds: pad(totalSeconds % 60),
  };
}

// Ticks its own local state every second in an isolated component, so the
// once-a-second re-render stays contained here instead of re-rendering the
// whole app (games, animations, etc. are completely unaffected).
export const NextRewardCountdown: React.FC<NextRewardCountdownProps> = ({ visible }) => {
  const [remainingMs, setRemainingMs] = useState<number>(() => getMsUntilNextMidnight());

  useEffect(() => {
    if (!visible) return;
    setRemainingMs(getMsUntilNextMidnight());
    const intervalId = setInterval(() => {
      setRemainingMs(getMsUntilNextMidnight());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [visible]);

  if (!visible) return null;

  const { hours, minutes, seconds } = splitDuration(remainingMs);
  const units: Array<{ value: string; label: string }> = [
    { value: hours, label: 'сағ' },
    { value: minutes, label: 'мин' },
    { value: seconds, label: 'сек' },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 -mt-1 mb-1 flex justify-center">
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border)] backdrop-blur-sm shadow-sm max-w-full">
        <Hourglass className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
        <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
          Келесі жұлдызға дейін
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {units.map((unit, idx) => (
            <React.Fragment key={unit.label}>
              {idx > 0 && <span className="text-[var(--text-faint)] font-bold text-sm pb-2.5">:</span>}
              <div className="flex flex-col items-center leading-none w-7">
                <span className="text-base font-bold text-[var(--accent)] tabular-nums">{unit.value}</span>
                <span className="text-[8px] uppercase text-[var(--text-faint)] tracking-wider">{unit.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
