import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, HelpCircle, Loader2, Check, AlertCircle, CloudUpload, Send } from 'lucide-react';
import type { DailyContent, DailyQuestionAnswer } from '../types';
import { PARTNER_NAME } from '../data/constants';
import { QUESTION_CATEGORY_LABELS, validateAnswer } from '../utils/dailyContent';
import { fetchDayAnswer, saveQuestionAnswer } from '../utils/dailyQuestionApi';

const MAX_ANSWER_LENGTH = 1000;

interface DailyQuestionModalProps {
  /** The day's question content (contentType === 'question'). */
  content: DailyContent | null;
  /** "Кейін жауап беремін" — closes without any penalty: the star and
   *  stardust the day already gave stay untouched. */
  onClose: () => void;
  /** Called after a definite save (server-accepted or offline-queued). */
  onSaved?: (answer: DailyQuestionAnswer | null) => void;
}

// The "Бүгінгі сұрақ" modal. Bottom-anchored on phones so the answer field
// stays visible while the keyboard is up, with inner scrolling, ≥44px
// buttons and a safe-area-aware footer. The text is plain text — React
// never renders stored answers as HTML, so injected markup can't execute.
export const DailyQuestionModal: React.FC<DailyQuestionModalProps> = ({
  content,
  onClose,
  onSaved,
}) => {
  const [answer, setAnswer] = useState('');
  const [savedAnswer, setSavedAnswer] = useState('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const dayKeyRef = useRef<number | null>(null);

  // (Re)load the previously saved answer whenever a different question
  // opens — one row per (user, day, questionId), so editing just updates it.
  useEffect(() => {
    if (!content || content.contentType !== 'question') return;
    if (dayKeyRef.current === content.dayNumber) return;
    dayKeyRef.current = content.dayNumber;
    setStatus('loading');
    setAnswer('');
    setSavedAnswer('');
    setErrorMessage('');
    setInfoMessage('');

    let cancelled = false;
    fetchDayAnswer(content.dayNumber)
      .then((existing) => {
        if (cancelled) return;
        if (existing) {
          setAnswer(existing.answer || '');
          setSavedAnswer(existing.answer || '');
        }
        setStatus('idle');
      })
      .catch(() => {
        // Offline: the form is still usable — saving goes to the queue.
        if (!cancelled) setStatus('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [content?.dayNumber, content?.contentType]);

  const trimmedLength = answer.trim().length;
  const validation = validateAnswer(answer);
  const canSave =
    status !== 'loading' &&
    status !== 'saving' &&
    trimmedLength >= 1 &&
    trimmedLength <= MAX_ANSWER_LENGTH;

  const handleSave = useCallback(async () => {
    if (!content || content.contentType !== 'question') return;
    if (!validation.ok) {
      setErrorMessage(validation.error || 'Жауапты жазыңыз.');
      return;
    }
    setStatus('saving');
    setErrorMessage('');
    setInfoMessage('');
    try {
      const result = await saveQuestionAnswer({
        dayNumber: content.dayNumber,
        questionId: content.questionId || `day-${content.dayNumber}-question`,
        question: content.question || '',
        answer,
      });
      if (!result.ok) {
        setErrorMessage(result.error || 'Жауапты сақтау мүмкін болмады.');
        setStatus('idle');
        return;
      }
      setSavedAnswer(answer.trim());
      setStatus('saved');
      if (result.queuedOffline) setInfoMessage(result.error || '');
      if (onSaved) {
        onSaved({
          id: '',
          userId: '',
          userName: '',
          dayNumber: content.dayNumber,
          date: '',
          questionId: content.questionId || `day-${content.dayNumber}-question`,
          question: content.question || '',
          answer: answer.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      setTimeout(() => {
        if (status === 'saved') setStatus('idle');
      }, 2500);
    } catch {
      setErrorMessage('Жауапты сақтау мүмкін болмады. Қайталап көріңіз.');
      setStatus('idle');
    }
  }, [answer, content, onSaved, status, validation.error, validation.ok]);

  if (!content || content.contentType !== 'question') return null;

  const categoryLabel = content.questionCategory
    ? QUESTION_CATEGORY_LABELS[content.questionCategory]
    : null;
  const isSavedState = status === 'saved' || (savedAnswer === answer.trim() && savedAnswer !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[var(--overlay)] backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="relative w-full max-w-sm rounded-t-[32px] sm:rounded-[40px] bg-[var(--bg-elevated)]/95 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="max-h-[85dvh] overflow-y-auto px-5 pt-5 sm:px-6 sm:pt-6 space-y-3">
          {/* Glowing accents */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-[var(--accent)]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{PARTNER_NAME}, бүгінгі сұрақ</span>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition flex-shrink-0 flex items-center justify-center"
              aria-label="Жабу"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Question */}
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-light italic text-[var(--accent)] leading-snug">
              {content.question}
            </h2>
            {categoryLabel && (
              <span className="mt-2 inline-flex px-2.5 py-0.5 rounded-full bg-[var(--accent-2)]/10 border border-[var(--accent-2)]/25 text-[var(--accent-2-dark)] text-[10px] font-semibold uppercase tracking-wide">
                {categoryLabel}
              </span>
            )}
          </div>

          {/* Hint */}
          {content.questionHint && (
            <div className="p-3 rounded-2xl bg-[var(--accent-2)]/8 border border-[var(--accent-2)]/25 text-[var(--accent-2-dark)] text-xs font-medium italic">
              ✨ {content.questionHint}
            </div>
          )}

          {/* Answer field */}
          <div>
            <textarea
              value={answer}
              onChange={(e) => {
                // Plain text only — no HTML is ever interpreted anywhere.
                setAnswer(e.target.value.slice(0, MAX_ANSWER_LENGTH));
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Жауабыңды осында жаз…"
              rows={5}
              maxLength={MAX_ANSWER_LENGTH}
              disabled={status === 'loading'}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none resize-none focus:border-[var(--accent)]/50 disabled:opacity-50"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-[var(--text-faint)] italic">
                {savedAnswer ? 'Жауап сақталған — жауабыңызды өзгерте аласыз.' : 'Кейінірек жауап беруге болады — жұлдыз және тозаң қайтарылмайды.'}
              </span>
              <span
                className={`text-[10px] tabular-nums ${
                  trimmedLength > MAX_ANSWER_LENGTH ? 'text-rose-500' : 'text-[var(--text-faint)]'
                }`}
              >
                {answer.length}/{MAX_ANSWER_LENGTH}
              </span>
            </div>
          </div>

          {/* Status / errors */}
          {status === 'loading' && (
            <p className="text-[11px] text-[var(--text-faint)] flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Жүктелуде…
            </p>
          )}
          {errorMessage && (
            <div className="flex items-start gap-1.5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {infoMessage && (
            <div className="flex items-start gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-600">
              <CloudUpload className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}
          {status === 'saved' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-600 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Жауабың сақталды ❤️</span>
            </div>
          )}
        </div>

        {/* Footer buttons — safe-area aware, ≥44px tall */}
        <div
          className="flex items-center gap-2 px-5 pb-5 pt-3 sm:px-6 border-t border-[var(--border)]"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-2xl bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs font-semibold border border-[var(--border)] hover:bg-[var(--bg-soft)] transition"
          >
            Кейін жауап беремін
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave && !isSavedState}
            className="flex-1 min-h-[44px] rounded-2xl btn-gold text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {status === 'saving' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status === 'saved' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{status === 'saving' ? 'Сақталуда…' : status === 'saved' ? 'Сақталды' : 'Жауапты сақтау'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DailyQuestionModal;
