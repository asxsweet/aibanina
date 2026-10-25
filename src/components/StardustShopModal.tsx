import React, { useState } from 'react';
import { Sparkles, Shield, Eye, Gift } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { MAX_SHIELDS, SHIELD_PRICE, PEEK_PRICE, WISH_PRICE } from '../utils/streakUtils';

interface ShopActionResult {
  ok: boolean;
  reason?: string;
}

interface StardustShopModalProps {
  stardust: number;
  shields: number;
  nextDay: number; // number of the next star she will get
  nextTitle: string; // its real title (shown only once unlocked)
  peekRevealed: boolean;
  canPeek: boolean; // only once today's star is claimed — otherwise "next" is today's
  onBuyShield: () => ShopActionResult;
  onBuyPeek: () => ShopActionResult;
  onSendWish: (text: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

export const StardustShopModal: React.FC<StardustShopModalProps> = ({
  stardust,
  shields,
  nextDay,
  nextTitle,
  peekRevealed,
  canPeek,
  onBuyShield,
  onBuyPeek,
  onSendWish,
  onClose,
}) => {
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [wishText, setWishText] = useState('');
  const [sending, setSending] = useState(false);

  const handleShield = () => {
    const r = onBuyShield();
    setMessage(r.ok ? { tone: 'ok', text: 'Қалқан алынды 🛡️' } : { tone: 'error', text: r.reason || 'Болмады.' });
  };

  const handlePeek = () => {
    const r = onBuyPeek();
    setMessage(r.ok ? { tone: 'ok', text: 'Ертеңгі жұлдыздың аты ашылды 👀' } : { tone: 'error', text: r.reason || 'Болмады.' });
  };

  const handleWish = async () => {
    const text = wishText.trim();
    if (!text || sending) return;
    setSending(true);
    setMessage(null);
    const r = await onSendWish(text);
    setSending(false);
    if (r.ok) {
      setWishText('');
      setMessage({ tone: 'ok', text: 'Тілегің жіберілді 💌 Ол оны көреді!' });
    } else {
      setMessage({ tone: 'error', text: r.error || 'Жіберу мүмкін болмады.' });
    }
  };

  const card = 'rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-3.5';
  const buy =
    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold btn-gold disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:scale-95';

  return (
    <ModalShell title="Жұлдыз дүкені" icon={<Sparkles className="w-5 h-5 text-[var(--accent)]" />} onClose={onClose}>
      <div className="flex items-center justify-between rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/25 px-4 py-3 mb-3">
        <span className="text-xs text-[var(--text-muted)]">Жұлдыз тозаңың</span>
        <span className="text-xl font-bold text-[var(--accent)]">{stardust} ✨</span>
      </div>

      {message && (
        <p
          className={`mb-3 rounded-xl px-3 py-2 text-xs ${
            message.tone === 'ok'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700'
              : 'bg-rose-500/10 border border-rose-400/30 text-rose-600'
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="space-y-3">
        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                <Shield className="w-4 h-4 text-[var(--accent-2)]" /> Жұлдыз қалқаны
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Бір өткізілген күнді жабады. Қолыңда: {shields}/{MAX_SHIELDS}
              </p>
            </div>
            <button onClick={handleShield} disabled={shields >= MAX_SHIELDS || stardust < SHIELD_PRICE} className={buy}>
              {SHIELD_PRICE} ✨
            </button>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                <Eye className="w-4 h-4 text-[var(--accent)]" /> Ертеңгі жұлдызға сығалау
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {peekRevealed
                  ? `Жұлдыз №${nextDay}: «${nextTitle}»`
                  : canPeek
                  ? `Жұлдыз №${nextDay} атын алдын ала көр.`
                  : 'Алдымен бүгінгі жұлдызды ал.'}
              </p>
            </div>
            <button onClick={handlePeek} disabled={!canPeek || peekRevealed || stardust < PEEK_PRICE} className={buy}>
              {peekRevealed ? 'Ашық' : `${PEEK_PRICE} ✨`}
            </button>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <Gift className="w-4 h-4 text-[var(--accent-2)]" /> Тілек жіберу
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-2">
            Одан бір нәрсе сұра: әңгіме, фильм таңдау… Тілегің оған бірден жетеді. Бағасы: {WISH_PRICE} ✨
          </p>
          <textarea
            value={wishText}
            onChange={(e) => setWishText(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Мысалы: маған бір ән жібер 🎵"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none focus:border-[var(--accent)]/50"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleWish}
              disabled={sending || !wishText.trim() || stardust < WISH_PRICE}
              className={buy}
            >
              {sending ? 'Жіберілуде…' : `Жіберу · ${WISH_PRICE} ✨`}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
