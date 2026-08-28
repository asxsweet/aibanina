import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Trash2, ChevronLeft, ChevronRight, Star, Link2, Link2Off, Loader2 } from 'lucide-react';
import { Photo } from '../types';
import { setPhotoReactions, setPhotoLinkedDay } from '../utils/photoUtils';

interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onToggleFavorite: (photo: Photo) => void;
  onDeleteConfirmed: (photo: Photo) => Promise<void>;
  onPhotoUpdated: (photo: Photo) => void;
}

const REACTION_PALETTE = ['❤️', '😍', '🥰', '😂', '😢', '👍'];

function formatRelativeDate(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'бүгін';
  if (days === 1) return 'кеше';
  if (days < 7) return `${days} күн бұрын`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} апта бұрын`;
  const date = new Date(timestamp);
  return date.toLocaleDateString('kk-KZ', { day: 'numeric', month: 'short' });
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onToggleFavorite,
  onDeleteConfirmed,
  onPhotoUpdated,
}) => {
  const photo = photos[currentIndex];
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setDeleteError('');
    setShowLinkPicker(false);
    setLinkInput('');
  }, [currentIndex]);

  if (!photo) return null;

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < photos.length - 1;

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      // Double-tap — Instagram-style: always shows the heart burst, and
      // favorites the photo if it isn't already (never un-favorites here).
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 700);
      if (!photo.isFavorite) {
        onToggleFavorite(photo);
      }
    }
    lastTapRef.current = now;
  };

  // Single tap on the trash icon deletes immediately — no confirmation step.
  const handleDeleteClick = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await onDeleteConfirmed(photo);
      // onDeleteConfirmed closes the lightbox / removes the photo on success —
      // nothing left to do here.
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Фотоны өшіру мүмкін болмады.');
      setIsDeleting(false);
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (reactionBusy) return;
    const has = photo.reactions?.includes(emoji);
    const nextReactions = has
      ? photo.reactions.filter((r) => r !== emoji)
      : [...(photo.reactions || []), emoji];
    setReactionBusy(true);
    try {
      const updated = await setPhotoReactions(photo.id, nextReactions);
      onPhotoUpdated(updated);
    } catch (err) {
      // silently ignore — reactions are low-stakes, no need for an error banner
    } finally {
      setReactionBusy(false);
    }
  };

  const handleLinkDay = async () => {
    const day = parseInt(linkInput, 10);
    if (!day || day < 1) return;
    try {
      const updated = await setPhotoLinkedDay(photo.id, day);
      onPhotoUpdated(updated);
      setShowLinkPicker(false);
    } catch (err) {
      // keep the picker open so they can retry
    }
  };

  const handleUnlinkDay = async () => {
    try {
      const updated = await setPhotoLinkedDay(photo.id, null);
      onPhotoUpdated(updated);
    } catch (err) {
      // no-op — they can just try again
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#211A12]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#FDFBF7]"
          aria-label="Жабу"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-xs text-[#D8C3A5]">
          {currentIndex + 1} / {photos.length}
        </span>
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#FDFBF7] disabled:opacity-60"
          aria-label="Өшіру"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Media with prev/next controls + double-tap like */}
      <div
        className="relative flex-1 flex items-center justify-center px-4 min-h-0"
        onClick={handleMediaTap}
      >
        {photo.mediaType === 'video' ? (
          <video
            key={photo.id}
            src={photo.dataUrl}
            controls
            playsInline
            className="max-h-full max-w-full rounded-[20px] object-contain"
          />
        ) : (
          <img
            src={photo.dataUrl}
            alt={photo.caption || 'Фото'}
            className="max-h-full max-w-full rounded-[20px] object-contain select-none"
            draggable={false}
          />
        )}

        {showHeartBurst && (
          <Heart
            className="absolute w-24 h-24 text-white fill-white pointer-events-none animate-[heartBurst_0.7s_ease-out]"
          />
        )}

        {canPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#FDFBF7]"
            aria-label="Алдыңғы"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {canNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#FDFBF7]"
            aria-label="Келесі"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Info + actions */}
      <div className="flex-shrink-0 p-4 max-h-[46%] overflow-y-auto">
        {deleteError && (
          <div className="mb-3 rounded-xl bg-rose-500/15 px-3 py-2 text-[11px] text-rose-300">
            {deleteError}
          </div>
        )}

        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-full bg-[#A9784F] flex items-center justify-center text-[11px] font-semibold text-[#FDFBF7] flex-shrink-0">
            {(photo.uploadedBy || '?').trim().charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-[#D8C3A5]">
            {photo.uploadedBy || 'Белгісіз'} · {formatRelativeDate(photo.uploadedAt)}
          </span>
        </div>

        {photo.caption && (
          <p className="font-serif italic text-[15px] text-[#FDFBF7] leading-relaxed mb-3">
            «{photo.caption}»
          </p>
        )}

        {/* Reactions row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {REACTION_PALETTE.map((emoji) => {
            const active = photo.reactions?.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                disabled={reactionBusy}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition ${
                  active ? 'bg-[#A9784F] scale-110' : 'bg-white/10'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {/* Constellation day link */}
        <div className="mb-3">
          {photo.linkedDay ? (
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-[#D8C3A5]">
                <Star className="w-3.5 h-3.5 text-[#A9784F] fill-[#A9784F]" />
                {photo.linkedDay}-жұлдызға тіркелген
              </span>
              <button onClick={handleUnlinkDay} className="text-[#D8C3A5] hover:text-[#FDFBF7]">
                <Link2Off className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : showLinkPicker ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="№ күн"
                className="w-20 rounded-xl bg-white/10 px-3 py-2 text-xs text-[#FDFBF7] placeholder:text-[#8B7A66] outline-none"
              />
              <button
                onClick={handleLinkDay}
                className="flex-1 py-2 rounded-xl bg-[#A9784F] text-[#FDFBF7] text-xs font-semibold"
              >
                Тіркеу
              </button>
              <button
                onClick={() => setShowLinkPicker(false)}
                className="px-3 py-2 rounded-xl bg-white/10 text-[#D8C3A5] text-xs"
              >
                Болдырмау
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLinkPicker(true)}
              className="flex items-center gap-1.5 text-xs text-[#D8C3A5] hover:text-[#FDFBF7]"
            >
              <Link2 className="w-3.5 h-3.5" />
              Жұлдызбен байланыстыру
            </button>
          )}
        </div>

        <button
          onClick={() => onToggleFavorite(photo)}
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
            photo.isFavorite ? 'bg-[#C97B8C] text-[#FDFBF7]' : 'bg-[rgba(201,123,140,0.18)] text-[#E8A8BC]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${photo.isFavorite ? 'fill-[#FDFBF7]' : ''}`} />
          {photo.isFavorite ? 'Таңдаулыда' : 'Таңдаулыға қосу'}
        </button>
      </div>
    </div>
  );
};
