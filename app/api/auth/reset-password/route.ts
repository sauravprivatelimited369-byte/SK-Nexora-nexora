import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hashOpaqueToken, hashPassword } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, requestIp } from '@/lib/api';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(requestIp(request), 'auth-reset-password', 5, 15 * 60);
    const parsed = z.object({ token: z.string().min(32).max(128), password: z.string().min(10).max(128) }).safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Choose a password with at least 10 characters.', 'INVALID_INPUT');
    const result = await query<{ id: string; user_id: string }>("SELECT id,user_id FROM auth_tokens WHERE token_hash=$1 AND purpose='reset_password' AND expires_at>NOW()", [hashOpaqueToken(parsed.data.token)]);
    const token = result.rows[0];
    if (!token) throw new HttpError(400, 'This password reset link is invalid or has expired. Request a new one.', 'TOKEN_EXPIRED');
    await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [await hashPassword(parsed.data.password), token.user_id]);
    await query('DELETE FROM auth_tokens WHERE user_id=$1 AND purpose=$2', [token.user_id, 'reset_password']);
    await query('DELETE FROM sessions WHERE user_id=$1', [token.user_id]);
    await query('INSERT INTO audit_logs (id,user_id,action,entity_type,metadata) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), token.user_id, 'auth.password_reset', 'user', '{}']);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
