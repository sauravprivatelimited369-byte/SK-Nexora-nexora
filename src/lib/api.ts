import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { query } from './db';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error('[nexora] request failed', error);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) throw new HttpError(403, 'Request origin could not be verified.', 'ORIGIN_REJECTED');
  let originUrl: URL;
  try { originUrl = new URL(origin); } catch { throw new HttpError(403, 'Request origin could not be verified.', 'ORIGIN_REJECTED'); }
  const forwardedHost = request.headers.get('x-forwarded-host');
  const requestHost = forwardedHost?.split(',')[0]?.trim() || request.headers.get('host') || new URL(request.url).host;
  if (originUrl.host !== requestHost) throw new HttpError(403, 'Request origin could not be verified.', 'ORIGIN_REJECTED');
}

export function requestIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 80)
    || request.headers.get('x-real-ip')?.slice(0, 80)
    || 'unknown';
}

export async function enforceRateLimit(key: string, action: string, limit: number, windowSeconds: number): Promise<void> {
  const keyHash = createHash('sha256').update(`${action}:${key}`).digest('hex');
  const result = await query<{ count: number }>(
    `INSERT INTO rate_limits (id,key_hash,action,count,window_started_at,updated_at)
     VALUES ($1,$2,$3,1,NOW(),NOW())
     ON CONFLICT (key_hash,action) DO UPDATE SET
       count = CASE WHEN rate_limits.window_started_at <= NOW() - ($4 * INTERVAL '1 second') THEN 1 ELSE rate_limits.count + 1 END,
       window_started_at = CASE WHEN rate_limits.window_started_at <= NOW() - ($4 * INTERVAL '1 second') THEN NOW() ELSE rate_limits.window_started_at END,
       updated_at = NOW()
     RETURNING count`,
    [randomUUID(), keyHash, action, windowSeconds],
  );
  if (Number(result.rows[0]?.count ?? limit + 1) > limit) throw new HttpError(429, 'You’re moving quickly. Please wait a moment and try again.', 'RATE_LIMITED');
}

export async function recordEvent(userId: string | null, eventName: string, properties: Record<string, unknown> = {}): Promise<void> {
  try {
    await query('INSERT INTO product_events (id,user_id,event_name,properties) VALUES ($1,$2,$3,$4)', [randomUUID(), userId, eventName, JSON.stringify(properties)]);
  } catch (error) {
    console.error('[nexora] product event could not be recorded', error);
  }
}

export async function recordAudit(userId: string | null, action: string, entityType?: string, entityId?: string, metadata: Record<string, unknown> = {}, ip?: string): Promise<void> {
  try {
    await query('INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,metadata,ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), userId, action, entityType ?? null, entityId ?? null, JSON.stringify(metadata), ip ?? null]);
  } catch (error) {
    console.error('[nexora] audit log could not be recorded', error);
  }
}

export function safeJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
