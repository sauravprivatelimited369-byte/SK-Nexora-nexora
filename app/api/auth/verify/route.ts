import { NextResponse } from 'next/server';
import { hashOpaqueToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { appUrl } from '@/lib/mail';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const login = (message: string) => NextResponse.redirect(appUrl(`/login?${message}`, request));
  if (token.length < 32 || token.length > 128) return login('error=invalid-verification');
  const result = await query<{ id: string; user_id: string }>(
    "SELECT id,user_id FROM auth_tokens WHERE token_hash=$1 AND purpose='verify_email' AND expires_at>NOW()",
    [hashOpaqueToken(token)],
  );
  const record = result.rows[0];
  if (!record) return login('error=invalid-verification');
  await query('UPDATE users SET email_verified_at=NOW(),updated_at=NOW() WHERE id=$1', [record.user_id]);
  await query('DELETE FROM auth_tokens WHERE user_id=$1 AND purpose=$2', [record.user_id, 'verify_email']);
  return login('verified=1');
}
