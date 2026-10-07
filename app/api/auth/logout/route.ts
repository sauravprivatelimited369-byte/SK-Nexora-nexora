import { NextResponse } from 'next/server';
import { revokeCurrentSession, getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, recordAudit } from '@/lib/api';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    await revokeCurrentSession();
    if (user) await recordAudit(user.id, 'auth.logout', 'session');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
