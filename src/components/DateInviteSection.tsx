import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Lock, Share2, Check, Sparkles, ShieldCheck, CalendarDays } from 'lucide-react';
import { DateInvite, DatePlanOption } from '../types';
import { fetchDatePlanOptions } from '../utils/dateInviteUtils';

interface DateInviteSectionProps {
  invite: DateInvite | null;
  isAdmin: boolean;
  loading: boolean;
  // She only ever calls this once, right at the end of her own
  // "ask -> pick place/day/time" flow — see the 'schedule' step below.
  // Place, day and time are all HERS to choose, not pre-filled by the
  // admin (see plan doc / video reference); the admin only curates the
  // list of place OPTIONS she picks from.
  onRespond: (day: string, time: string, plan: string, planLabel: string, dodgeCount: number) => Promise<void>;
  onExit: () => void;
  onOpenAdmin: () => void;
}

const KK_MONTHS = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
];
const KK_WEEKDAYS = ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'];

function formatDayKk(day: string): string {
  // day is YYYY-MM-DD
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  const dateObj = new Date(y, m - 1, d);
  return `${KK_WEEKDAYS[dateObj.getDay()]}, ${d} ${KK_MONTHS[m - 1]}`;
}

function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Dodge-count-indexed captions shown under the title while she tries (and
// fails) to click "No" — purely playful, mirrors the reference video's tone.
const DODGE_CAPTIONS = [
  'Ойлан тағы...',
  'Сонша ұялшақсың ба?',
  '«Жоқ» дегің келе ме шынымен?',
  'Гүл бірте-бірте сола бастады...',
  'Тағы да? 🥺',
  'Соңғы мүмкіндігің!',
  'Жарайды, жалғастыра беремін 😌',
];

const ROAM_WIDTH = 260;
const ROAM_HEIGHT = 150;
const NO_BTN_W = 78;
const NO_BTN_H = 38;

export const DateInviteSection: React.FC<DateInviteSectionProps> = ({
  invite,
  isAdmin,
  loading,
  onRespond,
  onExit,
  onOpenAdmin,
}) => {
  // 'ask' = the dodging "will you go out with me?" card (video screen 1).
  // 'schedule' = after she says yes, SHE picks the place, day & time
  // herself (video screen 2) — the admin only curates the place list.
  const [step, setStep] = useState<'ask' | 'schedule'>('ask');
  const [dodgeCount, setDodgeCount] = useState(0);
  const [noPos, setNoPos] = useState({ x: ROAM_WIDTH / 2 - NO_BTN_W / 2, y: ROAM_HEIGHT - NO_BTN_H - 4 });
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planOptions, setPlanOptions] = useState<DatePlanOption[]>([]);
  const [planOptionsLoading, setPlanOptionsLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [respondError, setRespondError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const roamRef = useRef<HTMLDivElement>(null);

  // Load the admin-managed "where to go" list once she reaches the
  // schedule step — no need to fetch it earlier since she can't see it
  // until she's said yes.
  useEffect(() => {
    if (step !== 'schedule' || planOptions.length > 0) return;
    setPlanOptionsLoading(true);
    fetchDatePlanOptions()
      .then(setPlanOptions)
      .catch(() => setRespondError('Нұсқаларды жүктеу мүмкін болмады.'))
      .finally(() => setPlanOptionsLoading(false));
  }, [step, planOptions.length]);

  const dodgeNo = () => {
    const nextX = Math.random() * (ROAM_WIDTH - NO_BTN_W);
    const nextY = Math.random() * (ROAM_HEIGHT - NO_BTN_H);
    setNoPos({ x: nextX, y: nextY });
    setDodgeCount((c) => c + 1);
  };

  const handleSeal = async () => {
    if (!invite || !selectedDay || !selectedTime || !selectedPlanId || responding) return;
    const planOption = planOptions.find((p) => p.id === selectedPlanId);
    if (!planOption) return;
    setResponding(true);
    setRespondError('');
    try {
      await onRespond(selectedDay, selectedTime, planOption.id, planOption.label, dodgeCount);
    } catch (err) {
      setRespondError(err instanceof Error ? err.message : 'Жіберу мүмкін болмады. Қайта байқап көр.');
    } finally {
      setResponding(false);
    }
  };

  const letterText = useMemo(() => {
    if (!invite || !invite.day || !invite.time || !invite.planLabel) return '';
    const lines = [
      `${formatDayKk(invite.day)} күні, сағат ${invite.time}-де, ${invite.planLabel.replace(/^\S+\s/, '')} жоспарлап отырмын.`,
    ];
    if (invite.note.trim()) lines.push(invite.note.trim());
    return lines.join('\n\n');
  }, [invite]);

  const handleShare = async () => {
    const shareText = `Бізде свидание жоспарланды 💌\n\n${letterText}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // user cancelled — no-op
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore, nothing worth surfacing
    }
  };

  // --- Loading -----------------------------------------------------------
  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 flex justify-center">
        <Sparkles className="w-7 h-7 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  // --- Locked placeholder (no invite exists yet) --------------------------
  if (!invite) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-10 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center">
          <Lock className="w-6 h-6 text-[var(--text-faint)]" />
        </div>
        <h2 className="font-serif text-xl italic text-[var(--text)]">Свидание</h2>
        <p className="text-xs text-[var(--text-faint)] max-w-[260px]">
          {isAdmin
            ? 'Бұл бөлім серіктесіңе доступ бергенде ашылады.'
            : 'Бұл бөлім әзірге жасырын тұр... Күте тұр 🤫'}
        </p>
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="mt-2 px-4 py-2 rounded-xl btn-gold text-xs font-bold flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Доступ беру
          </button>
        )}
      </div>
    );
  }

  // --- Admin, still pending (she hasn't picked place/day/time yet) -------
  if (isAdmin && invite.status === 'pending') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-10 flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
          <Heart className="w-6 h-6 text-[var(--accent)]" />
        </div>
        <h2 className="font-serif text-xl italic text-[var(--text)]">Доступ берілді</h2>
        <p className="text-xs text-[var(--text-faint)] max-w-[280px]">
          Ол әлі ешнәрсе таңдаған жоқ — орынды, күн мен уақытты видеодағыдай өзі таңдайды.
        </p>
        <button
          onClick={onOpenAdmin}
          className="mt-1 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)]"
        >
          Хабарламаны өзгерту
        </button>
      </div>
    );
  }

  // --- Accepted: the letter (both admin and partner land here) -----------
  if (invite.status === 'accepted' && invite.day && invite.time && invite.planLabel) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="w-full rounded-[28px] bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)]">
              📅 {formatDayKk(invite.day)}
            </span>
            <span className="px-3 py-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)]">
              ⏰ {invite.time}
            </span>
            <span className="px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[11px] font-bold text-[var(--accent)]">
              {invite.planLabel}
            </span>
          </div>
          <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-line font-serif italic">
            {letterText}
          </p>
          {invite.dodgeCount > 0 && !isAdmin && (
            <p className="mt-4 text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
              «Жоқ» {invite.dodgeCount} рет қашты 🏃‍♀️
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl btn-gold text-sm font-bold flex items-center justify-center gap-1.5"
          >
            {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {shareCopied ? 'Көшірілді' : 'Бөлісу'}
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)]"
          >
            Шығу
          </button>
        </div>
      </div>
    );
  }

  // --- Pending, partner's view, step 2: she picks place, day & time ------
  if (step === 'schedule') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="w-full rounded-[28px] bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-2)] font-bold mb-2">
            Ресми етейік
          </span>
          <h2 className="font-serif text-2xl italic text-[var(--text)] mb-1 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[var(--accent)]" />
            Күнін, уақытын, орнын таңда
          </h2>
          <p className="text-xs text-[var(--text-faint)] mb-5">Қалай, қашан ыңғайлы — өзің шеш</p>

          <div className="w-full grid grid-cols-2 gap-2.5 mb-4 text-left">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] mb-1 block">Қай күні?</label>
              <input
                type="date"
                min={getTodayDateStr()}
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] mb-1 block">Нешеде?</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
              />
            </div>
          </div>

          <div className="w-full mb-4 text-left">
            <label className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] mb-1.5 block">Қайда барамыз?</label>
            {planOptionsLoading ? (
              <div className="flex justify-center py-3">
                <Sparkles className="w-4 h-4 animate-spin text-[var(--accent)]" />
              </div>
            ) : planOptions.length === 0 ? (
              <p className="text-xs text-[var(--text-faint)] italic">Нұсқалар әлі қосылмаған.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {planOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedPlanId(opt.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
                      selectedPlanId === opt.id
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg-soft)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {respondError && <p className="text-xs text-rose-500 mb-3">{respondError}</p>}

          <button
            onClick={handleSeal}
            disabled={!selectedDay || !selectedTime || !selectedPlanId || responding}
            className="w-full py-3 rounded-2xl btn-gold text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {responding ? 'Жіберілуде...' : 'Хатқа айналдыру ❤'}
          </button>
        </div>
      </div>
    );
  }

  // --- Pending, partner's view, step 1: the playful ask card -------------
  const captionIndex = Math.min(dodgeCount, DODGE_CAPTIONS.length - 1);
  const flowerOpacity = Math.max(0.25, 1 - dodgeCount * 0.08);
  const flowerRotate = dodgeCount * 12;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
      <div className="w-full rounded-[28px] bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-sm flex flex-col items-center text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-2)] font-bold mb-2">
          Кішкене сұрақ
        </span>
        <h2 className="font-serif text-2xl italic text-[var(--text)] mb-1">
          Свиданияға <span className="text-[var(--accent)] not-italic font-bold">барасың ба</span>?
        </h2>
        <p className="text-xs text-[var(--text-faint)] mb-4 h-4">{DODGE_CAPTIONS[captionIndex]}</p>

        {/* No-roaming area */}
        <div
          ref={roamRef}
          className="relative w-full flex items-center justify-center"
          style={{ height: ROAM_HEIGHT }}
        >
          <span
            className="text-6xl select-none pointer-events-none transition-transform duration-300"
            style={{ opacity: flowerOpacity, transform: `rotate(${flowerRotate}deg)` }}
          >
            🌸
          </span>
          <button
            onMouseEnter={dodgeNo}
            onTouchStart={(e) => {
              e.preventDefault();
              dodgeNo();
            }}
            onClick={(e) => {
              e.preventDefault();
              dodgeNo();
            }}
            className="absolute px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)] transition-all duration-200 ease-out"
            style={{ left: noPos.x, top: noPos.y, width: NO_BTN_W, height: NO_BTN_H }}
          >
            Жоқ
          </button>
        </div>

        <button
          onClick={() => setStep('schedule')}
          className="w-full mt-2 py-3 rounded-2xl btn-gold text-base font-bold"
        >
          ИӘ
        </button>
        {dodgeCount > 0 && (
          <p className="mt-2 text-[10px] text-[var(--text-faint)]">{dodgeCount} рет қашты</p>
        )}
      </div>
    </div>
  );
};
