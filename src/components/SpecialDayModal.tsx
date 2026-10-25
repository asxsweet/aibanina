import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { SpecialDayItem } from '../utils/featureApi';

interface SpecialDayModalProps {
  items: SpecialDayItem[];
  onClose: () => void;
}

// A surprise tied to a calendar date (birthday, 8 March, Nauryz…) — shown once
// on that day, on top of the regular star.
export const SpecialDayModal: React.FC<SpecialDayModalProps> = ({ items, onClose }) => {
  const [index, setIndex] = useState(0);
  const item = items[index];
  if (!item) return null;
  const isLast = index >= items.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="relative w-full max-w-sm rounded-[32px] sm:rounded-[40px] bg-[var(--bg-elevated)]/95 p-6 sm:p-8 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden text-center"
      >
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-[var(--accent)]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[var(--accent-2)]/15 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
          aria-label="Жабу"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-5xl mb-2" aria-hidden="true">{item.emoji}</div>
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold mb-3">
          Бүгін ерекше күн
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl font-light italic text-[var(--accent)] mb-3 leading-snug">
          {item.title}
        </h2>
        {item.text && (
          <p className="text-sm sm:text-base text-[var(--text)] leading-relaxed font-light mb-4 italic font-serif">
            «{item.text}»
          </p>
        )}
        {item.hint && <p className="text-xs text-[var(--accent-2)] mb-4">{item.hint}</p>}

        <button
          onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
          className="px-5 py-2 rounded-full btn-gold text-xs font-bold transition hover:scale-105 active:scale-95"
        >
          {isLast ? 'Рақмет 💛' : 'Келесі'}
        </button>
      </motion.div>
    </div>
  );
};
