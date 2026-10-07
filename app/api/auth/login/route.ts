import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, verifyPassword } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, recordAudit, recordEvent, requestIp } from '@/lib/api';
import { query } from '@/lib/db';

const schema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = requestIp(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Enter a valid email and password.', 'INVALID_INPUT');
    const email = parsed.data.email.trim().toLowerCase();
    await enforceRateLimit(`${ip}:${email}`, 'auth-login', 10, 15 * 60);
    const result = await query<{ id: string; password_hash: string; email_verified_at: string | null }>('SELECT id,password_hash,email_verified_at FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
    }
    if (!user.email_verified_at) throw new HttpError(403, 'Verify your email using the link we sent before signing in.', 'EMAIL_UNVERIFIED');
    await createSession(user.id, request.headers.get('user-agent'));
    await recordAudit(user.id, 'auth.login', 'session', undefined, {}, ip);
    await recordEvent(user.id, 'user_login');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
