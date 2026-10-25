import React from 'react';
import { X } from 'lucide-react';

interface ResultToastProps {
  lines: string[];
  onClose: () => void;
}

// Short note after a round: time, record, stardust, how the rival is doing.
export const ResultToast: React.FC<ResultToastProps> = ({ lines, onClose }) => {
  if (lines.length === 0) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[65] w-[min(92vw,26rem)]"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      role="status"
    >
      <div className="flex items-start gap-2.5 rounded-2xl bg-[var(--bg-elevated)]/95 border border-[var(--accent)]/30 backdrop-blur-xl px-4 py-3 shadow-[0_12px_30px_var(--overlay)]">
        <div className="flex-1 space-y-0.5 text-xs text-[var(--text)]">
          {lines.map((line, i) => (
            <p key={i} className={i === 0 ? 'font-semibold' : 'text-[var(--text-secondary)]'}>
              {line}
            </p>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-faint)] hover:text-[var(--text)] flex-shrink-0"
          aria-label="Жасыру"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
