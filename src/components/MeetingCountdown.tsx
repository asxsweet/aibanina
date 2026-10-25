import React from 'react';
import { Plane } from 'lucide-react';
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
    <div className="w-full max-w-xl mx-auto px-4 mb-2">
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--accent-2)]/10 border border-[var(--accent-2)]/25 px-4 py-3">
        <Plane className="w-5 h-5 text-[var(--accent-2)] flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text)]">{text}</div>
          {meeting.label && <div className="text-[11px] text-[var(--text-muted)] truncate">{meeting.label}</div>}
        </div>
      </div>
    </div>
  );
};
