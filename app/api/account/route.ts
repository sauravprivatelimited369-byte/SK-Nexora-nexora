import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, revokeCurrentSession, verifyPassword } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordAudit, requestIp } from '@/lib/api';
import { query, transaction } from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to update your account.', 'UNAUTHENTICATED');
    const parsed = z.object({ name: z.string().trim().min(2).max(80), notifications: z.object({ learning: z.boolean(), projects: z.boolean(), product: z.boolean() }) }).safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Check your name and notification preferences.', 'INVALID_INPUT');
    await query('UPDATE users SET name=$1,updated_at=NOW() WHERE id=$2', [parsed.data.name, user.id]);
    await query('UPDATE profiles SET notification_preferences=$1,updated_at=NOW() WHERE user_id=$2', [JSON.stringify(parsed.data.notifications), user.id]);
    await recordAudit(user.id, 'account.settings_updated', 'user', user.id, {}, requestIp(request));
    return NextResponse.json({ ok: true, name: parsed.data.name });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to delete your account.', 'UNAUTHENTICATED');
    const parsed = z.object({ password: z.string().min(1).max(128), confirmation: z.literal('DELETE') }).safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Enter your password and type DELETE to confirm.', 'INVALID_INPUT');
    const account = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id=$1', [user.id]);
    if (!account.rows[0] || !(await verifyPassword(parsed.data.password, account.rows[0].password_hash))) throw new HttpError(403, 'The password did not match. Your account was not deleted.', 'PASSWORD_MISMATCH');
    await transaction(async (tx) => {
      await tx('INSERT INTO audit_logs (id,user_id,action,entity_type,metadata,ip_address) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), user.id, 'account.deletion_requested', 'user', JSON.stringify({ retention: 'User content deleted via cascading foreign keys.' }), requestIp(request)]);
      await tx('DELETE FROM users WHERE id=$1', [user.id]);
    });
    await revokeCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
