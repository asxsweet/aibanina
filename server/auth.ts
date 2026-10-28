// Compatibility layer for the original browser-local email/password system.
// Accounts are stored in localStorage; requests carry the selected user's
// email and role so newer shared features can continue to identify players.
import type { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'user';
export interface AuthInfo { email: string; role: Role; }

declare module 'express-serve-static-core' {
  interface Request { auth?: AuthInfo; }
}

export function authGate(req: Request, _res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') return next();
  const email = String(req.headers['x-app-email'] || 'guest@local').trim().toLowerCase();
  const role: Role = req.headers['x-app-role'] === 'admin' ? 'admin' : 'user';
  req.auth = { email, role };
  next();
}

export function canAccessUser(req: Request, userId: unknown): boolean {
  if (!req.auth) return true;
  if (req.auth.role === 'admin') return true;
  return typeof userId === 'string' && userId.trim().toLowerCase() === req.auth.email;
}

export async function getDisplayName(auth: AuthInfo): Promise<string> {
  return auth.role === 'admin' ? 'Әкімші' : auth.email.split('@')[0] || 'user';
}
