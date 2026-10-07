import { randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashOpaqueToken } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, requestIp } from '@/lib/api';
import { query } from '@/lib/db';
import { appUrl, sendActionEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = requestIp(request);
    await enforceRateLimit(ip, 'auth-forgot-password', 5, 15 * 60);
    const parsed = z.object({ email: z.email() }).safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Enter a valid email address.', 'INVALID_INPUT');
    if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST?.trim()) {
      throw new HttpError(503, 'Password recovery is unavailable until transactional email is configured.', 'EMAIL_NOT_CONFIGURED');
    }
    const email = parsed.data.email.trim().toLowerCase();
    const result = await query<{ id: string }>('SELECT id FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    let devResetUrl: string | undefined;
    if (user) {
      await query("DELETE FROM auth_tokens WHERE user_id=$1 AND purpose='reset_password'", [user.id]);
      const token = randomBytes(32).toString('base64url');
      const resetUrl = appUrl(`/reset-password?token=${encodeURIComponent(token)}`, request);
      await query('INSERT INTO auth_tokens (id,user_id,token_hash,purpose,expires_at) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), user.id, hashOpaqueToken(token), 'reset_password', new Date(Date.now() + 60 * 60 * 1000).toISOString()]);
      if (process.env.SMTP_HOST?.trim()) {
        await sendActionEmail(email, 'Reset your NEXORA password', `Use this link within one hour to choose a new password: ${resetUrl}`, `<p>Use this link within one hour to choose a new password:</p><p><a href="${resetUrl}">Reset password</a></p>`);
      } else {
        console.info(`[nexora:dev-email] Password reset for ${email}: ${resetUrl}`);
        devResetUrl = process.env.NODE_ENV === 'production' ? undefined : resetUrl;
      }
    }
    return NextResponse.json({ ok: true, message: 'If an account exists for that address, recovery instructions have been sent.', ...(devResetUrl ? { devResetUrl } : {}) });
  } catch (error) {
    return errorResponse(error);
  }
}
