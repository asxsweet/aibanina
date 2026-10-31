import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, MessageCircleHeart, Loader2 } from 'lucide-react';
import type { DailyQuestionAnswer } from '../types';
import { fetchMyAnswers } from '../utils/dailyQuestionApi';

interface MyAnswersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "Менің жауаптарым" — the signed-in user's own daily-question history.
// The endpoint only ever returns the caller's answers, so other people's
// answers never reach this screen.
export const MyAnswersModal: React.FC<MyAnswersModalProps> = ({ isOpen, onClose }) => {
  const [answers, setAnswers] = useState<DailyQuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMyAnswers()
      .then((list) => {
        if (!cancelled) setAnswers(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Оқу мүмкін болмады.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[var(--overlay)] backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[40px] bg-[var(--bg-elevated)]/95 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <h2 className="font-serif text-xl font-light italic text-[var(--accent)] flex items-center gap-2">
            <MessageCircleHeart className="w-5 h-5" />
            <span>Менің жауаптарым</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="max-h-[70dvh] overflow-y-auto px-5 py-4 space-y-2.5"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text-faint)]">
              <Loader2 className="w-5 h-5 animate-spin mb-2" />
              <span className="text-xs">Жүктелуде…</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
              {error}
            </div>
          ) : answers.length === 0 ? (
            <p className="text-center py-10 text-xs text-[var(--text-faint)] italic">
              Әзірге ешбір сұраққа жауап берген жоқсың. Күнделікті ойыннан кейін сұрақ ашылса, жауабы осында сақталады. 💬
            </p>
          ) : (
            answers.map((a) => (
              <div key={a.id || `${a.dayNumber}-${a.questionId}`} className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                    {a.dayNumber}-күн
                  </span>
                  <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
                    {formatDate(a.updatedAt || a.createdAt)}
                  </span>
                </div>
                <p className="text-xs font-medium text-[var(--text)] mb-1.5 leading-snug">{a.question}</p>
                <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words leading-relaxed">
                  {a.answer}
                </p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MyAnswersModal;
