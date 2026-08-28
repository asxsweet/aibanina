import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Plus, Trash2, Loader2 } from 'lucide-react';
import { TimeCapsule } from '../types';
import { fetchCapsules, createCapsule, deleteCapsule } from '../utils/extrasUtils';
import { getTodayDateString } from '../utils/constellationUtils';

interface TimeCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

// Letters locked until a future date — the admin writes one now and it only
// becomes openable once its unlock date arrives, like a real time capsule.
export const TimeCapsuleModal: React.FC<TimeCapsuleModalProps> = ({ isOpen, onClose, isAdmin }) => {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formDate, setFormDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchCapsules()
      .then(setCapsules)
      .catch(() => setError('Хаттарды жүктеу мүмкін болмады.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const today = getTodayDateString();

  const handleCreate = async () => {
    if (!formTitle.trim() || !formText.trim() || !formDate) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCapsule(formTitle.trim(), formText.trim(), formDate);
      setCapsules((prev) => [...prev, created].sort((a, b) => a.unlockDate.localeCompare(b.unlockDate)));
      setFormTitle('');
      setFormText('');
      setFormDate('');
      setFormOpen(false);
    } catch {
      setError('Сақтау мүмкін болмады.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = capsules;
    setCapsules((cur) => cur.filter((c) => c.id !== id));
    try {
      await deleteCapsule(id);
    } catch {
      setCapsules(prev);
      setError('Өшіру мүмкін болмады.');
    }
  };

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
            <Mail className="w-5 h-5" />
            <h2 className="font-serif text-xl italic">Уақыт капсулалары</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Белгілі бір күнге дейін құлыпталған хаттар — сол күн келгенде ғана ашылады.
          </p>

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
          )}

          {error && <p className="text-xs text-rose-500 mb-3">{error}</p>}

          {!loading && capsules.length === 0 && !error && (
            <p className="text-xs text-[var(--text-faint)] italic py-4 text-center">Әзірге хаттар жоқ.</p>
          )}

          <div className="flex flex-col gap-2.5 mb-4">
            {capsules.map((c) => {
              const isUnlocked = c.unlockDate <= today;
              const isRevealed = isUnlocked && openedId === c.id;
              return (
                <div key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3.5">
                  {isRevealed ? (
                    <div className="text-left">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-serif italic text-[var(--accent)] text-sm break-words min-w-0">{c.title}</h3>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="flex-shrink-0 text-[var(--text-faint)] hover:text-rose-500"
                            aria-label="Хатты өшіру"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text)] leading-relaxed italic font-serif break-words">«{c.text}»</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => isUnlocked && setOpenedId(c.id)}
                      className="w-full flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isUnlocked ? (
                          <Mail className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm truncate ${
                            isUnlocked ? 'text-[var(--text)] font-medium' : 'text-[var(--text-faint)]'
                          }`}
                        >
                          {isUnlocked ? c.title : 'Құлыпталған хат'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-faint)] flex-shrink-0">
                        {isUnlocked ? 'Ашу үшін бас' : c.unlockDate}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <div className="pt-3 border-t border-[var(--border)]">
              {!formOpen ? (
                <button
                  onClick={() => setFormOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-[var(--accent)]/40 text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent)]/5 transition"
                >
                  <Plus className="w-4 h-4" /> Жаңа хат жасау
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value.slice(0, 80))}
                    placeholder="Хат тақырыбы"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]/50"
                  />
                  <textarea
                    value={formText}
                    onChange={(e) => setFormText(e.target.value.slice(0, 1000))}
                    placeholder="Хат мәтіні…"
                    rows={3}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none resize-none focus:border-[var(--accent)]/50"
                  />
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormOpen(false)}
                      disabled={saving}
                      className="flex-1 py-2 rounded-xl bg-[var(--bg-soft)] text-[var(--text-muted)] text-xs font-semibold disabled:opacity-50"
                    >
                      Бас тарту
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={saving || !formTitle.trim() || !formText.trim() || !formDate}
                      className="flex-1 py-2 rounded-xl btn-gold text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Сақталуда…' : 'Сақтау'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
