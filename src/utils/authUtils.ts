export interface AppUser { id: string; email: string; name: string; bio?: string; role: 'admin' | 'user'; }
const AUTH_KEY = 'nashe_sozvezdie_auth_v1';
const USERS_KEY = 'nashe_sozvezdie_users_v1';
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const encodePassword = (value: string) => btoa(unescape(encodeURIComponent(value)));
const decodePassword = (value: string) => { try { return decodeURIComponent(escape(atob(value))); } catch { return value; } };
export const DEFAULT_ADMIN = { email: 'asylzhan@gmail.com', password: 'admin123', name: 'Әкімші' };

export function ensureDefaultAdmin(): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(USERS_KEY);
  const users: Record<string, AppUser & { password: string }> = raw ? JSON.parse(raw) : {};
  if (!users[DEFAULT_ADMIN.email]) {
    users[DEFAULT_ADMIN.email] = { id: 'admin-user', email: DEFAULT_ADMIN.email, name: DEFAULT_ADMIN.name, role: 'admin', password: encodePassword(DEFAULT_ADMIN.password) };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}
export function getCurrentUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try { const raw = localStorage.getItem(AUTH_KEY); if (!raw) return null; const user = JSON.parse(raw) as AppUser; return user?.id && user?.email ? user : null; } catch { return null; }
}
function setCurrentUser(user: AppUser | null): void { if (!user) localStorage.removeItem(AUTH_KEY); else localStorage.setItem(AUTH_KEY, JSON.stringify(user)); }
export function loginUser(email: string, password: string): AppUser {
  ensureDefaultAdmin(); const normalized = normalizeEmail(email); const raw = localStorage.getItem(USERS_KEY);
  const users: Record<string, AppUser & { password: string }> = raw ? JSON.parse(raw) : {}; const found = users[normalized];
  if (!found) throw new Error('Мұндай поштамен пайдаланушы табылмады.');
  if (decodePassword(found.password) !== password) throw new Error('Құпия сөз қате.');
  const user: AppUser = { id: found.id, email: found.email, name: found.name, bio: found.bio, role: found.role }; setCurrentUser(user); return user;
}
export function registerUser(email: string, password: string): AppUser {
  ensureDefaultAdmin(); const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) throw new Error('Дұрыс пошта мекенжайын енгізіңіз.');
  if (password.trim().length < 6) throw new Error('Құпия сөз кемінде 6 таңбадан тұруы керек.');
  const raw = localStorage.getItem(USERS_KEY); const users: Record<string, AppUser & { password: string }> = raw ? JSON.parse(raw) : {};
  if (users[normalized]) throw new Error('Мұндай поштамен пайдаланушы бұрыннан бар.');
  const record: AppUser & { password: string } = { id: `user_${Math.random().toString(36).slice(2, 10)}`, email: normalized, name: normalized.split('@')[0], role: 'user', password: encodePassword(password) };
  users[normalized] = record; localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const user: AppUser = { id: record.id, email: record.email, name: record.name, role: record.role }; setCurrentUser(user); return user;
}
export function logoutUser(): void { setCurrentUser(null); }
export async function refreshCurrentUser(): Promise<AppUser | null> { return getCurrentUser(); }
export async function updateUserProfile(email: string, updates: { name?: string; bio?: string }): Promise<AppUser> {
  const normalized = normalizeEmail(email); const raw = localStorage.getItem(USERS_KEY);
  const users: Record<string, AppUser & { password: string }> = raw ? JSON.parse(raw) : {}; const found = users[normalized];
  if (!found) throw new Error('Пайдаланушы табылмады.'); if (typeof updates.name === 'string' && !updates.name.trim()) throw new Error('Аты бос болмауы керек.');
  const updated = { ...found, name: updates.name?.trim() || found.name, bio: updates.bio?.trim() || '' }; users[normalized] = updated; localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const user: AppUser = { id: updated.id, email: updated.email, name: updated.name, bio: updated.bio, role: updated.role }; setCurrentUser(user); return user;
}
