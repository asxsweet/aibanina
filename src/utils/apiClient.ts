// Backend base URL. On Vercel (frontend), set VITE_API_URL to your Render
// backend URL, e.g. https://nashe-sozvezdie-api.onrender.com — no trailing
// slash. Left empty, requests go to a relative /api/... path, which only
// works when the frontend and backend are served from the same origin
// (e.g. local dev via the Vite proxy in vite.config.ts).
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'nashe_sozvezdie_token_v2';

// Fired (on window) when the server says the session is no longer valid, so
// the app can drop back to the sign-in screen.
export const AUTH_EXPIRED_EVENT = 'nashe:auth-expired';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode) — session just won't persist
  }
}

// Reads the expiry out of our own signed token (payload is plain base64url
// JSON). Only used to avoid showing the app with an already-dead session;
// the server is always the real judge.
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const body = token.split('.')[0];
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);
    return typeof payload.exp !== 'number' || payload.exp < Date.now();
  } catch {
    return true;
  }
}

// True only for requests to OUR backend — the session token must never be
// sent to any other site (Telegram, YouTube, fonts…).
export function isApiUrl(url: string): boolean {
  if (API_BASE) return url.startsWith(`${API_BASE}/api/`) || url === `${API_BASE}/api`;
  return url.startsWith('/api/') || url === '/api';
}

const isAuthEndpoint = (url: string) => /\/api\/auth\/(login|register)(\?|$)/.test(url);

let installed = false;

// Wraps window.fetch once, so every existing `fetch(`${API_BASE}/api/...`)`
// call in the app automatically carries the Authorization header — no need
// to touch each of those call sites.
export function installAuthFetch(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isApiUrl(url)) return originalFetch(input, init);

    const headers = new Headers(init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));
    try {
      const raw = localStorage.getItem('nashe_sozvezdie_auth_v1');
      const user = raw ? JSON.parse(raw) : null;
      if (user?.email) headers.set('X-App-Email', user.email);
      if (user?.role) headers.set('X-App-Role', user.role);
      if (user?.name) headers.set('X-App-Name', user.name);
    } catch { /* private mode */ }
    const nextInit = { ...init, headers };

    const response = await originalFetch(input, nextInit);
    return response;
  };
}
