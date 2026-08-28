export interface AppUser {
  id: string;
  email: string;
  name: string;
  bio?: string;
  role: 'admin' | 'user';
}

const AUTH_KEY = 'nashe_sozvezdie_auth_v1';
const USERS_KEY = 'nashe_sozvezdie_users_v1';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const encodePassword = (value: string) => {
  if (typeof window === 'undefined') return value;
  return btoa(unescape(encodeURIComponent(value)));
};

const decodePassword = (value: string) => {
  if (typeof window === 'undefined') return value;
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return value;
  }
};

export const DEFAULT_ADMIN = {
  email: 'asylzhan@gmail.com',
  password: 'admin123',
  name: 'Әкімші',
};

export function ensureDefaultAdmin(): void {
  if (typeof window === 'undefined') return;

  const usersRaw = localStorage.getItem(USERS_KEY);
  const users: Record<string, AppUser & { password: string }> = usersRaw ? JSON.parse(usersRaw) : {};

  if (!users[DEFAULT_ADMIN.email]) {
    users[DEFAULT_ADMIN.email] = {
      id: 'admin-user',
      email: DEFAULT_ADMIN.email,
      name: DEFAULT_ADMIN.name,
      role: 'admin',
      password: encodePassword(DEFAULT_ADMIN.password),
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

export function getCurrentUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AppUser;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AppUser | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function loginUser(email: string, password: string): AppUser {
  ensureDefaultAdmin();

  const normalizedEmail = normalizeEmail(email);
  const usersRaw = localStorage.getItem(USERS_KEY);
  const users: Record<string, AppUser & { password: string }> = usersRaw ? JSON.parse(usersRaw) : {};

  const user = users[normalizedEmail];
  if (!user) {
    throw new Error('Мұндай поштамен пайдаланушы табылмады.');
  }

  if (decodePassword(user.password) !== password) {
    throw new Error('Құпия сөз қате.');
  }

  const currentUser: AppUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    bio: user.bio,
    role: user.role,
  };

  setCurrentUser(currentUser);
  return currentUser;
}

export function registerUser(email: string, password: string): AppUser {
  ensureDefaultAdmin();

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Дұрыс пошта мекенжайын енгізіңіз.');
  }
  if (password.trim().length < 6) {
    throw new Error('Құпия сөз кемінде 6 таңбадан тұруы керек.');
  }

  const usersRaw = localStorage.getItem(USERS_KEY);
  const users: Record<string, AppUser & { password: string }> = usersRaw ? JSON.parse(usersRaw) : {};

  if (users[normalizedEmail]) {
    throw new Error('Мұндай поштамен пайдаланушы бұрыннан бар.');
  }

  const newUser: AppUser & { password: string } = {
    id: `user_${Math.random().toString(36).slice(2, 10)}`,
    email: normalizedEmail,
    name: normalizedEmail.split('@')[0],
    role: 'user',
    password: encodePassword(password),
  };

  users[normalizedEmail] = newUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const currentUser: AppUser = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
  };

  setCurrentUser(currentUser);
  return currentUser;
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export function updateUserProfile(
  email: string,
  updates: { name?: string; bio?: string }
): AppUser {
  if (typeof window === 'undefined') {
    throw new Error('updateUserProfile can only run in the browser.');
  }

  const normalizedEmail = normalizeEmail(email);
  const usersRaw = localStorage.getItem(USERS_KEY);
  const users: Record<string, AppUser & { password: string }> = usersRaw ? JSON.parse(usersRaw) : {};

  const existing = users[normalizedEmail];
  if (!existing) {
    throw new Error('Пайдаланушы табылмады.');
  }

  const trimmedName = updates.name?.trim();
  if (typeof updates.name === 'string' && !trimmedName) {
    throw new Error('Аты бос болмауы керек.');
  }

  const updated: AppUser & { password: string } = {
    ...existing,
    name: trimmedName || existing.name,
    bio: typeof updates.bio === 'string' ? updates.bio.trim() : existing.bio,
  };

  users[normalizedEmail] = updated;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const currentUser: AppUser = {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    bio: updated.bio,
    role: updated.role,
  };

  setCurrentUser(currentUser);
  return currentUser;
}
