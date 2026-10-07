import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordEvent } from '@/lib/api';

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'Webhook endpoint is not configured.' }, { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, 'hex'); } catch { received = Buffer.alloc(0); }
  if (!signature || received.length !== expected.length || !timingSafeEqual(expected, received)) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  let payload: Record<string, any>;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid webhook body.' }, { status: 400 }); }
  const event = String(payload.event || '');
  const subscription = payload.payload?.subscription?.entity;
  const subscriptionId = subscription?.id;
  if (!subscriptionId) return NextResponse.json({ received: true, ignored: true });
  const local = await query<{ id: string; user_id: string; plan_id: string }>('SELECT id,user_id,plan_id FROM subscriptions WHERE provider=$1 AND provider_subscription_id=$2', ['razorpay', subscriptionId]);
  if (!local.rows[0]) return NextResponse.json({ received: true, ignored: true });
  const statusMap: Record<string, string> = {
    'subscription.activated': 'active', 'subscription.charged': 'active',
    'subscription.cancelled': 'cancelled', 'subscription.halted': 'past_due',
    'subscription.paused': 'past_due', 'subscription.resumed': 'active',
  };
  const status = statusMap[event];
  if (status) {
    const start = subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null;
    const end = subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null;
    await query('UPDATE subscriptions SET status=$1,current_period_start=COALESCE($2,current_period_start),current_period_end=COALESCE($3,current_period_end),cancel_at_period_end=CASE WHEN $4=TRUE THEN FALSE ELSE cancel_at_period_end END,updated_at=NOW() WHERE id=$5', [status, start, end, event === 'subscription.cancelled', local.rows[0].id]);
    if (status === 'active') await recordEvent(local.rows[0].user_id, 'subscription_started', { plan: local.rows[0].plan_id, source: 'webhook' });
  }
  const payment = payload.payload?.payment?.entity;
  if (payment?.id && (event === 'subscription.charged' || event === 'payment.captured')) {
    await query('INSERT INTO payments (id,user_id,subscription_id,provider,provider_payment_id,amount_paise,currency,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (provider_payment_id) DO NOTHING', [randomUUID(), local.rows[0].user_id, local.rows[0].id, 'razorpay', payment.id, Number(payment.amount || 0), payment.currency || 'INR', 'captured']);
  }
  await query('INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), local.rows[0].user_id, `billing.webhook.${event || 'unknown'}`, 'subscription', subscriptionId, JSON.stringify({ provider_event_id: payload.id || null })]);
  return NextResponse.json({ received: true });
}
