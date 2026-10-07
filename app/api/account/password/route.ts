import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser, hashOpaqueToken, hashPassword, verifyPassword } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, recordAudit, requestIp } from '@/lib/api';
import { query } from '@/lib/db';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to change your password.', 'UNAUTHENTICATED');
    await enforceRateLimit(user.id, 'password-change', 5, 60 * 60);
    const parsed = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) }).safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Choose a new password with at least 10 characters.', 'INVALID_INPUT');
    const account = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id=$1', [user.id]);
    if (!account.rows[0] || !(await verifyPassword(parsed.data.currentPassword, account.rows[0].password_hash))) throw new HttpError(403, 'Current password is incorrect.', 'PASSWORD_MISMATCH');
    const cookieStore = await cookies();
    const token = cookieStore.get('nexora_session')?.value;
    if (!token) throw new HttpError(401, 'Your session expired. Sign in again.', 'UNAUTHENTICATED');
    await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [await hashPassword(parsed.data.newPassword), user.id]);
    await query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2', [user.id, hashOpaqueToken(token)]);
    await recordAudit(user.id, 'account.password_changed', 'user', user.id, {}, requestIp(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
