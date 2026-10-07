import { randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, hashOpaqueToken, hashPassword } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, recordAudit, recordEvent, requestIp } from '@/lib/api';
import { query } from '@/lib/db';
import { appUrl, sendActionEmail } from '@/lib/mail';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = requestIp(request);
    await enforceRateLimit(ip, 'auth-register', 8, 15 * 60);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Add your name, a valid email, and a password with at least 10 characters.', 'INVALID_INPUT');
    const { name, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const requiresEmail = Boolean(process.env.SMTP_HOST?.trim());
    if (process.env.NODE_ENV === 'production' && !requiresEmail) {
      throw new HttpError(503, 'Sign-up is temporarily unavailable because email verification has not been configured.', 'EMAIL_NOT_CONFIGURED');
    }
    const duplicate = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (duplicate.rowCount) throw new HttpError(409, 'An account with this email already exists. Try signing in instead.', 'EMAIL_EXISTS');

    const userId = randomUUID();
    await query('INSERT INTO users (id,email,name,password_hash,email_verified_at) VALUES ($1,$2,$3,$4,$5)', [userId, email, name, await hashPassword(password), requiresEmail ? null : new Date().toISOString()]);
    await query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);

    if (requiresEmail) {
      const token = randomBytes(32).toString('base64url');
      const actionUrl = appUrl(`/api/auth/verify?token=${encodeURIComponent(token)}`, request);
      try {
        await query('INSERT INTO auth_tokens (id,user_id,token_hash,purpose,expires_at) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), userId, hashOpaqueToken(token), 'verify_email', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()]);
        await sendActionEmail(email, 'Verify your NEXORA account', `Welcome to NEXORA. Verify your email within 24 hours: ${actionUrl}`, `<p>Welcome to NEXORA.</p><p><a href="${actionUrl}">Verify your email</a> (link expires in 24 hours).</p>`);
      } catch (error) {
        await query('DELETE FROM users WHERE id=$1', [userId]);
        throw error;
      }
      await recordEvent(userId, 'user_signup', { verification: 'email' });
      return NextResponse.json({ ok: true, requiresVerification: true, message: 'Check your inbox for a verification link. It expires in 24 hours.' }, { status: 201 });
    }

    await createSession(userId, request.headers.get('user-agent'));
    await recordAudit(userId, 'account.created', 'user', userId, {}, ip);
    await recordEvent(userId, 'user_signup', { verification: 'development' });
    return NextResponse.json({ ok: true, requiresVerification: false }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
