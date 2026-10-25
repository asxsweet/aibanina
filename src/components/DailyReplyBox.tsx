import React, { useEffect, useState } from 'react';
import { MessageCircleHeart, Loader2, Check } from 'lucide-react';
import { fetchReply, saveReply } from '../utils/extrasUtils';

const MOODS = ['🥰', '😍', '🥲', '😴', '💪', '😊'];

interface DailyReplyBoxProps {
  dayNumber: number;
}

// A small reply box shown on every star card so the daily ritual isn't
// one-directional: the partner can leave a mood emoji and/or a few words
// back on that day's message, saved to the shared backend.
export const DailyReplyBox: React.FC<DailyReplyBoxProps> = ({ dayNumber }) => {
  const [mood, setMood] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [savedMood, setSavedMood] = useState<string | null>(null);
  const [savedText, setSavedText] = useState('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setMood(null);
    setText('');
    setSavedMood(null);
    setSavedText('');

    fetchReply(dayNumber)
      .then((reply) => {
        if (cancelled) return;
        setMood(reply?.mood || null);
        setText(reply?.text || '');
        setSavedMood(reply?.mood || null);
        setSavedText(reply?.text || '');
        setStatus('idle');
      })
      .catch(() => {
        // Backend not reachable (e.g. offline/local dev without Mongo) —
        // hide the box rather than show a broken control.
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [dayNumber]);

  if (status === 'unavailable') return null;

  const hasChanges = mood !== savedMood || text.trim() !== savedText.trim();

  const handleSave = async () => {
    setStatus('saving');
    try {
      const saved = await saveReply(dayNumber, { mood: mood || undefined, text: text.trim() });
      setSavedMood(saved.mood || null);
      setSavedText(saved.text || '');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="mb-4 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-left">
      <div className="flex items-center gap-2 mb-2.5 text-[var(--accent)] text-xs font-semibold uppercase tracking-wide">
        <MessageCircleHeart className="w-3.5 h-3.5" />
        <span>Бүгінгі көңіл күйің қалай?</span>
      </div>

      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood((prev) => (prev === m ? null : m))}
            disabled={status === 'loading'}
            className={`text-lg w-8 h-8 flex items-center justify-center rounded-full border transition disabled:opacity-40 ${
              mood === m
                ? 'bg-[var(--accent)]/15 border-[var(--accent)]'
                : 'border-transparent hover:bg-[var(--bg-soft)]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 300))}
        disabled={status === 'loading'}
        placeholder="Осы жұлдызға қысқаша жауап қалдыр…"
        rows={2}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none resize-none focus:border-[var(--accent)]/50 disabled:opacity-50"
      />

      <div className="flex items-center justify-end mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || status === 'saving' || status === 'loading'}
          className="px-3 py-1.5 rounded-full btn-gold text-[11px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {status === 'saved' && <Check className="w-3.5 h-3.5" />}
          <span>{status === 'saved' ? 'Сақталды' : 'Жіберу'}</span>
        </button>
      </div>
    </div>
  );
};
