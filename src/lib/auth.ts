import 'server-only';
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { query } from './db';

const scrypt = promisify(scryptCb);
const SESSION_COOKIE = 'nexora_session';
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'COLLEGE_ADMIN' | 'FACULTY';
  email_verified_at: string | null;
  onboarding_complete: boolean;
  branch: string | null;
  current_year: string | null;
  skill_level: string | null;
  primary_goal: string | null;
  technologies: string;
  weekly_hours: string | null;
  username: string | null;
  portfolio_public: boolean;
};

export function hashOpaqueToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    const [algorithm, saltHex, hashHex] = passwordHash.split('$');
    if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function createSession(userId: string, userAgent?: string | null): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await query('INSERT INTO sessions (id,user_id,token_hash,expires_at,user_agent) VALUES ($1,$2,$3,$4,$5)', [sessionId, userId, hashOpaqueToken(token), expiresAt, userAgent?.slice(0, 512) ?? null]);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await query('DELETE FROM sessions WHERE token_hash=$1', [hashOpaqueToken(token)]);
  cookieStore.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await query<CurrentUser>(
    `SELECT u.id,u.email,u.name,u.role,u.email_verified_at,
      COALESCE(p.onboarding_complete,FALSE) AS onboarding_complete,
      p.branch,p.current_year,p.skill_level,p.primary_goal,p.technologies,p.weekly_hours,p.username,
      COALESCE(p.portfolio_public,FALSE) AS portfolio_public
     FROM sessions s JOIN users u ON u.id=s.user_id
     LEFT JOIN profiles p ON p.user_id=u.id
     WHERE s.token_hash=$1 AND s.expires_at > NOW()`,
    [hashOpaqueToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function getOptionalUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}
