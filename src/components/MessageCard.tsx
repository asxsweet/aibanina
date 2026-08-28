import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, X, Copy, Check, Mic, Download, Loader2 } from 'lucide-react';
import { DailyMessage, Photo } from '../types';
import { PARTNER_NAME } from '../data/constants';
import { DailyReplyBox } from './DailyReplyBox';
import { downloadMessagePoster } from '../utils/exportUtils';

interface MessageCardProps {
  message: DailyMessage | null;
  onClose: () => void;
  isTodayWin?: boolean;
  linkedPhoto?: Photo | null;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onClose,
  isTodayWin = false,
  linkedPhoto = null,
}) => {
  const [copied, setCopied] = useState(false);
  const [heartReacted, setHeartReacted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!message) return null;

  const handleCopy = () => {
    const textToCopy = `«${message.title}»\n\n${message.text}\n\n— Біздің шоқжұлдыздан ✨`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPoster = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadMessagePoster(message);
    } catch (err) {
      console.error('Poster export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative w-full max-w-sm rounded-[32px] sm:rounded-[40px] bg-[var(--bg-elevated)]/95 p-6 sm:p-8 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden text-center"
        >
          {/* Subtle glowing background lights inside card */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-[var(--accent)]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[var(--accent-2)]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition hover:bg-[var(--border)]"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>
              {isTodayWin ? `${PARTNER_NAME}, бүгінгі жұлдыз жанды!` : `${PARTNER_NAME} үшін №${message.dayNumber} жұлдыз`}
            </span>
          </div>

          {/* Chapter-complete note — shown on day 30, 60, 90... when a new
              constellation chapter has just opened up on the map */}
          {message.dayNumber % 30 === 0 && (
            <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-2)]/10 border border-[var(--accent-2)]/30 text-[var(--accent-2-dark)] text-[11px] font-semibold">
              🎉 {message.dayNumber / 30}-тарау аяқталды — жаңа аспан картасы ашылды
            </div>
          )}

          {/* Title in Georgia / serif font */}
          <h2 className="font-serif text-2xl sm:text-3xl font-light italic text-[var(--accent)] mb-3 leading-snug">
            {message.title}
          </h2>

          {/* Voice message player — shown on weekly voice-message days (7, 14, 21, 28...) */}
          {message.voiceUrl && (
            <div className="mb-4 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-left">
              <div className="flex items-center gap-2 mb-2 text-[var(--accent)] text-xs font-semibold uppercase tracking-wide">
                <Mic className="w-3.5 h-3.5" />
                <span>Дауыстық хабарлама</span>
              </div>
              <audio controls preload="none" className="w-full h-9">
                <source src={message.voiceUrl} type="audio/mpeg" />
                Браузеріңіз аудионы қолдамайды.
              </audio>
            </div>
          )}

          {/* Linked gallery photo/video — attached to this day from the Gallery tab */}
          {linkedPhoto && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-[var(--border)]">
              {linkedPhoto.mediaType === 'video' ? (
                <video src={linkedPhoto.dataUrl} controls playsInline className="w-full max-h-56 bg-black" />
              ) : (
                <img src={linkedPhoto.dataUrl} alt={linkedPhoto.caption || ''} className="w-full max-h-56 object-cover" />
              )}
            </div>
          )}

          {/* Main message text */}
          <p className="text-sm sm:text-base text-[var(--text)] leading-relaxed font-light mb-4 text-left sm:text-center italic font-serif">
            «{message.text}»
          </p>

          {/* Sweet hint / P.S. */}
          {message.hint && (
            <div className="mb-5 p-3 rounded-2xl bg-[var(--accent-2)]/8 border border-[var(--accent-2)]/25 text-[var(--accent-2-dark)] text-xs font-medium italic">
              ✨ {message.hint}
            </div>
          )}

          {/* Two-way reply — the partner can leave a mood/short note back */}
          <DailyReplyBox dayNumber={message.dayNumber} />

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-[var(--border)]">
            {/* Heart reaction button */}
            <button
              onClick={() => setHeartReacted(!heartReacted)}
              className={`px-3 py-2 rounded-full border transition flex items-center gap-1.5 text-xs font-medium ${
                heartReacted
                  ? 'bg-[var(--accent-2)] text-[var(--on-accent)] border-[var(--accent-2)] shadow-md font-semibold'
                  : 'bg-[var(--bg-card)] text-[var(--accent-2)] border-[var(--accent-2)]/30 hover:bg-[var(--bg-soft)]'
              }`}
              title="Таңдаулыға сақтау"
            >
              <Heart
                className={`w-4 h-4 ${
                  heartReacted ? 'fill-[var(--on-accent)] text-[var(--on-accent)]' : 'fill-[var(--accent-2)]/30 text-[var(--accent-2)]'
                }`}
              />
              <span>{heartReacted ? 'Таңдаулыда' : 'Ұнатамын'}</span>
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-soft)] transition flex items-center gap-1.5 text-xs font-medium"
              title="Мәтінді көшіру"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Көшірілді</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[var(--accent)]" />
                  <span>Көшіру</span>
                </>
              )}
            </button>

            {/* Save-as-poster / print button — same notebook-letter design
                shown in the export preview, downloaded as a PNG the user
                can keep or print out on paper */}
            <button
              onClick={handleDownloadPoster}
              disabled={isExporting}
              className="px-3 py-2 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-soft)] transition flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-wait"
              title="Хат ретінде сақтау / басып шығару"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-[var(--accent)]" />
              )}
              <span>{isExporting ? 'Дайындалуда…' : 'Хатты сақтау'}</span>
            </button>

            {/* Close / View constellation button */}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full btn-gold text-xs font-bold transition hover:scale-105 active:scale-95"
            >
              Шоқжұлдызға
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
