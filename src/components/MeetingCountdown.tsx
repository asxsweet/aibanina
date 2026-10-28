import React from 'react';
import { Plane, ChevronRight } from 'lucide-react';
import { daysBetween } from '../utils/streakUtils';
import type { Meeting } from '../utils/featureApi';

interface MeetingCountdownProps {
  meeting: Meeting | null;
  today: string; // YYYY-MM-DD
}

export const MeetingCountdown: React.FC<MeetingCountdownProps> = ({ meeting, today }) => {
  if (!meeting) return null;
  const daysLeft = daysBetween(today, meeting.date);
  // Nothing to show a few days after the meeting has happened.
  if (daysLeft < -3) return null;

  let text: string;
  if (daysLeft > 1) text = `Кездесуге ${daysLeft} күн қалды`;
  else if (daysLeft === 1) text = 'Кездесуге бір ғана түн қалды!';
  else if (daysLeft === 0) text = 'Бүгін кездесеміз! 🥳';
  else text = 'Кездесу болды — жүрегім әлі сонда 💛';

  return (
    <div className="w-full max-w-xl mx-auto px-4 mt-3">
      <div className="flex items-center gap-3 rounded-[24px] border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-4 py-3 shadow-sm backdrop-blur-md">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[var(--accent-2)]/15">
          <Plane className="h-4 w-4 text-[var(--accent-2)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--text)]">{text}</div>
          {meeting.label && <div className="truncate text-[11px] text-[var(--text-muted)]">{meeting.label}</div>}
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-faint)]" />
      </div>
    </div>
  );
};
