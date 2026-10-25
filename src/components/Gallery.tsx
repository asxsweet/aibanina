import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Heart, ImageOff, Loader2, Search, Video as VideoIcon, Sparkles, Camera } from 'lucide-react';
import { Photo } from '../types';
import {
  fetchPhotos,
  uploadPhoto,
  setPhotoFavorite,
  deletePhoto,
  resizeImage,
  readVideoFile,
} from '../utils/photoUtils';
import { getWeeklyChallenge } from '../data/constants';
import { PhotoLightbox } from './PhotoLightbox';

interface GalleryProps {
  currentUserName: string;
  daysPlayed?: number;
}

function isSameMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function yearsAgoLabel(years: number): string {
  if (years === 1) return '1 жыл бұрын';
  return `${years} жыл бұрын`;
}

export const Gallery: React.FC<GalleryProps> = ({ currentUserName, daysPlayed = 0 }) => {
  const challenge = useMemo(() => getWeeklyChallenge(daysPlayed), [daysPlayed]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorite'>('all');
  const [uploaderFilter, setUploaderFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ dataUrl: string; caption: string; mediaType: 'photo' | 'video' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchPhotos();
      setPhotos(list);
    } catch (err) {
      setError('Галереяны жүктеу мүмкін болмады. Сервермен байланысты тексер.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // "На этот день" — surface a memory uploaded on this same month+day in a
  // previous year, so opening the gallery occasionally brings a nice surprise.
  const onThisDayPhoto = useMemo(() => {
    const today = new Date();
    let best: { photo: Photo; years: number } | null = null;
    for (const p of photos) {
      const d = new Date(p.uploadedAt);
      if (d.getFullYear() === today.getFullYear()) continue;
      if (isSameMonthDay(d, today)) {
        const years = today.getFullYear() - d.getFullYear();
        if (!best || years < best.years) best = { photo: p, years };
      }
    }
    return best;
  }, [photos]);

  const uploaders = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => p.uploadedBy && set.add(p.uploadedBy));
    return Array.from(set);
  }, [photos]);

  const visiblePhotos = useMemo(() => {
    let list = filter === 'favorite' ? photos.filter((p) => p.isFavorite) : photos;
    if (uploaderFilter) list = list.filter((p) => p.uploadedBy === uploaderFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.caption.toLowerCase().includes(q) || p.uploadedBy.toLowerCase().includes(q)
      );
    }
    return list;
  }, [photos, filter, uploaderFilter, searchQuery]);

  useEffect(() => {
    if (lightboxIndex !== null && lightboxIndex >= visiblePhotos.length) {
      setLightboxIndex(visiblePhotos.length > 0 ? visiblePhotos.length - 1 : null);
    }
  }, [visiblePhotos.length, lightboxIndex]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    const isVideo = file.type.startsWith('video/');
    try {
      if (isVideo) {
        const dataUrl = await readVideoFile(file);
        setPendingUpload({ dataUrl, caption: '', mediaType: 'video' });
      } else {
        const dataUrl = await resizeImage(file);
        setPendingUpload({ dataUrl, caption: '', mediaType: 'photo' });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Файлды өңдеу мүмкін болмады.');
    }
  };

  const confirmUpload = async () => {
    if (!pendingUpload) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const photo = await uploadPhoto(pendingUpload.dataUrl, pendingUpload.caption, currentUserName, pendingUpload.mediaType);
      setPhotos((prev) => [photo, ...prev]);
      setPendingUpload(null);
    } catch (err) {
      setUploadError('Файлды жүктеу мүмкін болмады. Тағы байқап көр.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleFavorite = async (photo: Photo) => {
    const nextValue = !photo.isFavorite;
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, isFavorite: nextValue } : p)));
    try {
      await setPhotoFavorite(photo.id, nextValue);
    } catch (err) {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, isFavorite: !nextValue } : p)));
    }
  };

  const handlePhotoUpdated = (updated: Photo) => {
    setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Delete now waits for server confirmation before touching local state or
  // closing the viewer — fixes the earlier "delete does nothing" issue where
  // the UI could get out of sync if the request silently failed.
  const handleDeleteConfirmed = async (photo: Photo) => {
    await deletePhoto(photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    setLightboxIndex(null);
  };

  const lastAddedLabel = photos.length > 0
    ? new Date(photos[0].uploadedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="w-full max-w-lg mx-auto my-3 px-4 relative z-10">
      {/* Weekly photo challenge banner — a fresh prompt every 7 days,
          encouraging something more than just tapping through the game */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-start gap-3 mb-3 p-3 rounded-[24px] bg-[var(--accent-2)]/10 border border-[var(--accent-2)]/25 text-left hover:bg-[var(--accent-2)]/15 transition"
      >
        <div className="w-12 h-12 rounded-2xl flex-shrink-0 bg-[var(--bg-soft)] flex items-center justify-center text-2xl">
          {challenge.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-2-dark)] uppercase tracking-wide">
            <Camera className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Апталық тапсырма · {challenge.title}</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-snug mt-0.5 line-clamp-2 break-words">
            {challenge.prompt}
          </p>
        </div>
      </button>

      {/* "На этот день" memory banner */}
      {onThisDayPhoto && (
        <button
          onClick={() => {
            const idx = visiblePhotos.findIndex((p) => p.id === onThisDayPhoto.photo.id);
            if (idx >= 0) setLightboxIndex(idx);
          }}
          className="w-full flex items-center gap-3 mb-3 p-3 rounded-[24px] bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-left hover:bg-[var(--accent)]/15 transition"
        >
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-[var(--bg-soft)]">
            {onThisDayPhoto.photo.mediaType === 'video' ? (
              <video src={onThisDayPhoto.photo.dataUrl} className="w-full h-full object-cover" muted />
            ) : (
              <img src={onThisDayPhoto.photo.dataUrl} className="w-full h-full object-cover" alt="" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              Осы күні · {yearsAgoLabel(onThisDayPhoto.years)}
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {onThisDayPhoto.photo.caption || 'Естелікті ашу'}
            </p>
          </div>
        </button>
      )}

      <div className="bg-[var(--bg-elevated)]/70 border border-[var(--border)] rounded-[32px] sm:rounded-[40px] p-6 sm:p-7 backdrop-blur-xl shadow-[0_20px_50px_var(--overlay)] relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-1 gap-2">
          <h3 className="font-serif text-xl sm:text-2xl font-light italic text-[var(--accent)] truncate">
            Біздің галерея
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSearch((v) => !v)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                showSearch ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--bg-soft)] text-[var(--text-muted)]'
              }`}
              aria-label="Іздеу"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0"
              aria-label="Фото немесе видео қосу"
            >
              <Plus className="w-[18px] h-[18px] text-[var(--on-accent)]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>

        <p className="text-[11px] text-[var(--text-faint)] mb-3">
          {photos.length} файл{lastAddedLabel ? ` · соңғысы ${lastAddedLabel} қосылды` : ''}
        </p>

        {/* Search input */}
        {showSearch && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Қолтаңба немесе аты бойынша іздеу…"
            className="w-full mb-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]/50"
          />
        )}

        {/* Uploader filter pills */}
        {uploaders.length > 1 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setUploaderFilter(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                !uploaderFilter ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--bg-soft)] text-[var(--text-muted)]'
              }`}
            >
              Барлығы
            </button>
            {uploaders.map((name) => (
              <button
                key={name}
                onClick={() => setUploaderFilter(name)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                  uploaderFilter === name ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--bg-soft)] text-[var(--text-muted)]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 text-center py-2 rounded-xl text-xs font-semibold transition ${
              filter === 'all' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--bg-soft)] text-[var(--text-muted)]'
            }`}
          >
            Барлық фото
          </button>
          <button
            onClick={() => setFilter('favorite')}
            className={`flex-1 text-center py-2 rounded-xl text-xs font-semibold transition ${
              filter === 'favorite' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--bg-soft)] text-[var(--text-muted)]'
            }`}
          >
            Таңдаулылар
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 text-[var(--text-faint)]">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-xs">Галерея жүктелуде…</span>
          </div>
        ) : visiblePhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
            <ImageOff className="w-7 h-7 text-[var(--text-faint)]" />
            <p className="text-sm text-[var(--text-muted)] max-w-[220px]">
              {searchQuery
                ? 'Ештеңе табылмады.'
                : filter === 'favorite'
                ? 'Таңдаулыда әзірге фото жоқ.'
                : 'Мұнда ортақ фотоларың пайда болады. Біріншісін қос!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {visiblePhotos.map((photo, idx) => (
              <button
                key={photo.id}
                onClick={() => setLightboxIndex(idx)}
                className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--bg-soft)]"
              >
                {photo.mediaType === 'video' ? (
                  <video src={photo.dataUrl} className="w-full h-full object-cover" muted preload="metadata" />
                ) : (
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || 'Фото'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {photo.mediaType === 'video' && (
                  <span className="absolute bottom-1.5 left-1.5 w-[18px] h-[18px] rounded-full bg-[var(--bg-elevated)]/85 flex items-center justify-center">
                    <VideoIcon className="w-[10px] h-[10px] text-[var(--accent)]" />
                  </span>
                )}
                {photo.isFavorite && (
                  <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full bg-[var(--bg-elevated)]/85 flex items-center justify-center">
                    <Heart className="w-[10px] h-[10px] text-[var(--accent-2)] fill-[var(--accent-2)]" />
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-faint)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition"
              aria-label="Фото немесе видео қосу"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Caption step before confirming upload */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md">
          <div className="w-full max-w-sm bg-[var(--bg-elevated)]/95 rounded-[28px] p-5 border border-[var(--border)] shadow-[0_20px_50px_var(--overlay)] max-h-[90vh] overflow-y-auto">
            {pendingUpload.mediaType === 'video' ? (
              <video
                src={pendingUpload.dataUrl}
                controls
                playsInline
                className="w-full max-h-64 rounded-2xl mb-4 bg-black"
              />
            ) : (
              <img
                src={pendingUpload.dataUrl}
                alt="Алдын ала қарау"
                className="w-full max-h-64 object-contain rounded-2xl mb-4 bg-[var(--bg-soft)]"
              />
            )}
            <label className="block mb-4">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Қолтаңба (міндетті емес)
              </span>
              <textarea
                value={pendingUpload.caption}
                onChange={(e) => setPendingUpload({ ...pendingUpload, caption: e.target.value })}
                placeholder="Осы сәт туралы бірер сөз…"
                maxLength={300}
                rows={2}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none resize-none focus:border-[var(--accent)]/50"
              />
            </label>
            {uploadError && (
              <div className="mb-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
                {uploadError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setPendingUpload(null); setUploadError(''); }}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-soft)] text-[var(--text-secondary)] text-xs font-semibold disabled:opacity-50"
              >
                Болдырмау
              </button>
              <button
                onClick={confirmUpload}
                disabled={isUploading}
                className="flex-1 py-2.5 rounded-xl btn-gold text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isUploading ? 'Жүктелуде…' : 'Галереяға қосу'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen viewer */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={visiblePhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onToggleFavorite={handleToggleFavorite}
          onDeleteConfirmed={handleDeleteConfirmed}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}
    </div>
  );
};
