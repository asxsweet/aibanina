import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PartyPopper } from 'lucide-react';
import { MilestoneBonus } from '../data/constants';
import { ThemeName } from '../utils/constellationUtils';

interface MilestoneModalProps {
  milestone: MilestoneBonus | null;
  onClose: () => void;
  onApplyTheme: (theme: ThemeName) => void;
}

// Celebrates a streak milestone (7/14/21/30 days) the first time it's
// reached, and offers to switch straight to the theme it just unlocked.
export const MilestoneModal: React.FC<MilestoneModalProps> = ({ milestone, onClose, onApplyTheme }) => {
  if (!milestone) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative w-full max-w-sm rounded-[32px] sm:rounded-[40px] bg-[var(--bg-elevated)]/95 p-6 sm:p-8 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden text-center"
        >
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-[var(--accent)]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[var(--accent-2)]/15 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition hover:bg-[var(--border)]"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold mb-3">
            <PartyPopper className="w-3.5 h-3.5" />
            <span>Жаңа деңгей ашылды</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-light italic text-[var(--accent)] mb-3 leading-snug">
            {milestone.title}
          </h2>

          <p className="text-sm sm:text-base text-[var(--text)] leading-relaxed font-light mb-5 italic font-serif">
            «{milestone.text}»
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-[var(--border)]">
            <button
              onClick={() => {
                onApplyTheme(milestone.theme);
                onClose();
              }}
              className="px-4 py-2 rounded-full btn-gold text-xs font-bold transition hover:scale-105 active:scale-95"
            >
              Жаңа теманы қолдану
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--bg-soft)] transition"
            >
              Кейінірек
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
