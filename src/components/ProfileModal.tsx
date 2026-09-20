import React, { useState, useEffect } from 'react';
import { X, UserRound, Mail, Save, Check, Sparkles } from 'lucide-react';
import { AppUser } from '../utils/authUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  onSave: (updates: { name: string; bio: string }) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Reset the form fields whenever the modal is (re)opened, so stale edits
  // from a previous open don't linger.
  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setBio(user.bio || '');
      setError('');
      setSaved(false);
    }
  }, [isOpen, user.name, user.bio]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Атыңызды енгізіңіз.');
      return;
    }
    setError('');
    onSave({ name: trimmed, bio: bio.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-[var(--bg-elevated)]/95 rounded-[32px] sm:rounded-[40px] p-6 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h2 className="font-serif text-xl font-light italic text-[var(--accent)] flex items-center gap-2">
            <UserRound className="w-5 h-5 text-[var(--accent)]" />
            <span>Профиль</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-4 space-y-4">
          {/* Avatar circle with first letter of name */}
          <div className="flex flex-col items-center gap-2 pb-1">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center">
              <span className="font-serif text-2xl italic text-[var(--accent)]">
                {(name || user.name || '?').trim().charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <UserRound className="w-3.5 h-3.5 text-[var(--accent)]" />
              Аты
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Атыңыз"
              maxLength={40}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none transition focus:border-[var(--accent)]/50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              Өзің туралы (міндетті емес)
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Өзің туралы бірер сөз…"
              maxLength={140}
              rows={3}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none transition focus:border-[var(--accent)]/50 resize-none"
            />
            <span className="mt-1 block text-right text-[10px] text-[var(--text-faint)]">{bio.length}/140</span>
          </label>

          <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
            <Mail className="w-3.5 h-3.5" />
            <span>{user.email}</span>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-2xl btn-gold px-4 py-3 text-sm font-bold transition hover:scale-[1.01]"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Сақталды</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сақтау</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
