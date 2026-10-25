import React from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

// Shared look for the small popups added with the streak/stardust features:
// dimmed backdrop (tap to close), rounded card, title row with a close button.
export const ModalShell: React.FC<ModalShellProps> = ({ title, icon, onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div
      className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-[32px] bg-[var(--bg-elevated)]/95 p-5 sm:p-6 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <h2 className="font-serif text-xl font-light italic text-[var(--accent)] flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
          aria-label="Жабу"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pt-3 text-sm text-[var(--text-secondary)]">{children}</div>
    </div>
  </div>
);
