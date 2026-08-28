import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Plus, Trash2, Loader2, Check } from 'lucide-react';
import { DreamItem } from '../types';
import { fetchDreams, addDream, toggleDream, deleteDream } from '../utils/extrasUtils';

interface DreamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
}

// A shared checklist of dreams/plans to do together — either partner can
// add an item or check one off; everything is saved to the shared backend.
export const DreamsModal: React.FC<DreamsModalProps> = ({ isOpen, onClose, currentUserName }) => {
  const [dreams, setDreams] = useState<DreamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchDreams()
      .then(setDreams)
      .catch(() => setError('Тізімді жүктеу мүмкін болмады.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      const created = await addDream(text, currentUserName);
      setDreams((prev) => [...prev, created]);
      setNewText('');
    } catch {
      setError('Қосу мүмкін болмады.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: DreamItem) => {
    setDreams((prev) => prev.map((d) => (d.id === item.id ? { ...d, isDone: !d.isDone } : d)));
    try {
      await toggleDream(item.id, !item.isDone);
    } catch {
      setDreams((prev) => prev.map((d) => (d.id === item.id ? { ...d, isDone: item.isDone } : d)));
      setError('Жаңарту мүмкін болмады.');
    }
  };

  const handleDelete = async (id: string) => {
    const prevDreams = dreams;
    setDreams((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDream(id);
    } catch {
      setDreams(prevDreams);
      setError('Өшіру мүмкін болмады.');
    }
  };

  const doneCount = dreams.filter((d) => d.isDone).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[var(--overlay)] backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-[var(--bg-elevated)]/97 p-6 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)]"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1 text-[var(--accent)]">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-serif text-xl italic">Бірлескен армандар</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {dreams.length > 0 ? `${doneCount}/${dreams.length} орындалды` : 'Бірге орындағың келетін армандарыңды қос'}
          </p>

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
          )}

          {error && <p className="text-xs text-rose-500 mb-3">{error}</p>}

          <div className="flex flex-col gap-2 mb-4">
            {dreams.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-2.5"
              >
                <button
                  onClick={() => handleToggle(d)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition ${
                    d.isDone ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--accent)]'
                  }`}
                  aria-label="Белгілеу"
                >
                  {d.isDone && <Check className="w-3 h-3 text-[var(--on-accent)]" />}
                </button>
                <span className={`flex-1 min-w-0 text-sm break-words ${d.isDone ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text)]'}`}>
                  {d.text}
                </span>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="flex-shrink-0 text-[var(--text-faint)] hover:text-rose-500"
                  aria-label="Өшіру"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {!loading && dreams.length === 0 && !error && (
              <p className="text-xs text-[var(--text-faint)] italic py-4 text-center">Әзірге тізім бос.</p>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value.slice(0, 150))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder="Жаңа арман қосу…"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]/50"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newText.trim()}
              className="px-3.5 py-2 rounded-xl btn-gold text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              aria-label="Қосу"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
