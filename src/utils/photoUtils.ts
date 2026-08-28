import { Photo } from '../types';

// Same pattern as constellationUtils.ts — points at the Render backend in
// production via VITE_API_URL, or a relative path locally (proxied by Vite).
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Raw file size caps, checked client-side before we even try to read the
// file (base64 encoding adds ~33% on top of this, kept under the server's
// 20mb JSON body limit with headroom).
export const MAX_IMAGE_FILE_BYTES = 15 * 1024 * 1024; // 15MB raw photo
export const MAX_VIDEO_FILE_BYTES = 14 * 1024 * 1024; // 14MB raw video (~10-15s compressed clip)

// Resize + compress an image client-side before upload, so a raw phone
// photo (often several MB) doesn't bloat MongoDB or slow down the gallery.
// Keeps the longest edge under maxDim and re-encodes as JPEG.
export function resizeImage(file: File, maxDim = 1080, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      reject(new Error('Фото тым үлкен (максимум 15МБ).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Файлды оқу мүмкін болмады.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Суретті жүктеу мүмкін болмады.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas қолжетімсіз.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Videos aren't re-encoded client-side (no reliable browser API for that) —
// just read as base64 directly, with a duration + size check so an
// accidentally-huge clip doesn't get uploaded.
export function readVideoFile(file: File, maxDurationSeconds = 20): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_VIDEO_FILE_BYTES) {
      reject(new Error('Видео тым үлкен (максимум 14МБ, ~10-15 секунд).'));
      return;
    }
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > maxDurationSeconds) {
        reject(new Error(`Видео тым ұзақ (максимум ${maxDurationSeconds} секунд).`));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Видеоны оқу мүмкін болмады.'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    videoEl.onerror = () => reject(new Error('Видеоны оқу мүмкін болмады.'));
    videoEl.src = URL.createObjectURL(file);
  });
}

export async function fetchPhotos(): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/photos`);
  if (!res.ok) {
    throw new Error('Галереяны жүктеу мүмкін болмады.');
  }
  const data = await res.json();
  return (data.photos || []) as Photo[];
}

export async function uploadPhoto(
  dataUrl: string,
  caption: string,
  uploadedBy: string,
  mediaType: 'photo' | 'video' = 'photo'
): Promise<Photo> {
  const res = await fetch(`${API_BASE}/api/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl, caption, uploadedBy, mediaType }),
  });
  if (!res.ok) {
    throw new Error('Файлды жүктеу мүмкін болмады.');
  }
  const data = await res.json();
  return data.photo as Photo;
}

async function patchPhoto(id: string, body: Record<string, unknown>): Promise<Photo> {
  const res = await fetch(`${API_BASE}/api/photos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error('Фотоны жаңарту мүмкін болмады.');
  }
  const data = await res.json();
  return data.photo as Photo;
}

export async function setPhotoFavorite(id: string, isFavorite: boolean): Promise<Photo> {
  return patchPhoto(id, { isFavorite });
}

export async function setPhotoReactions(id: string, reactions: string[]): Promise<Photo> {
  return patchPhoto(id, { reactions });
}

export async function setPhotoLinkedDay(id: string, linkedDay: number | null): Promise<Photo> {
  return patchPhoto(id, { linkedDay });
}

export async function deletePhoto(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/photos/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    let message = 'Фотоны өшіру мүмкін болмады.';
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // response wasn't JSON — keep the default message
    }
    throw new Error(message);
  }
}
