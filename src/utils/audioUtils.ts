// Checks whether an audio file (voice message) actually loads, so the admin
// panel can show a real OK/broken status per day instead of admins finding
// out from their partner that a voice message is silent.
//
// voiceUrl values are frontend-relative paths (e.g. "/voice/day-07.mp3"),
// served as static files by the same host that serves the app (Vite's
// `public/` folder in dev and build) — NOT by the API server. So this
// resolves against window.location, not VITE_API_URL.

export type AudioCheckStatus = 'checking' | 'ok' | 'missing' | 'error';

export interface AudioCheckResult {
  status: AudioCheckStatus;
  detail?: string;
}

export async function checkAudioUrl(voiceUrl: string): Promise<AudioCheckResult> {
  if (!voiceUrl) return { status: 'missing', detail: 'URL көрсетілмеген' };

  const resolvedUrl = new URL(voiceUrl, window.location.origin).toString();

  try {
    // HEAD first — cheap, no need to download the whole mp3 just to check
    // it exists. Some static hosts don't support HEAD, so fall back to a
    // ranged GET if HEAD looks unsupported (405/501) or doesn't resolve.
    let res = await fetch(resolvedUrl, { method: 'HEAD', cache: 'no-store' });

    if (res.status === 405 || res.status === 501) {
      res = await fetch(resolvedUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-1' },
        cache: 'no-store',
      });
    }

    if (!res.ok && res.status !== 206) {
      return { status: 'missing', detail: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.includes('audio') && !contentType.includes('octet-stream')) {
      // Most commonly this means the dev/prod server served index.html
      // instead of the mp3 (a classic symptom of the file not being in
      // the static assets folder), which is a 200 but the wrong content.
      return { status: 'error', detail: `Күтпеген түр: ${contentType}` };
    }

    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', detail: err instanceof Error ? err.message : 'Желі қатесі' };
  }
}
