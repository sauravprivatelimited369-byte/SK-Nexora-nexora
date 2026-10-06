import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordAudit, recordEvent } from '@/lib/api';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to manage your plan.', 'UNAUTHENTICATED');
    const subscription = await query<{ id: string; provider_subscription_id: string; cancel_at_period_end: boolean }>("SELECT id,provider_subscription_id,cancel_at_period_end FROM subscriptions WHERE user_id=$1 AND provider='razorpay' AND status IN ('active','trialing','past_due') ORDER BY created_at DESC LIMIT 1", [user.id]);
    const current = subscription.rows[0];
    if (!current) throw new HttpError(404, 'No active subscription was found.', 'SUBSCRIPTION_NOT_FOUND');
    if (current.cancel_at_period_end) return NextResponse.json({ ok: true, message: 'Your subscription is already set to cancel at the end of the billing period.' });
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !secret) throw new HttpError(503, 'Subscription management is not configured.', 'PAYMENTS_NOT_CONFIGURED');
    const auth = Buffer.from(`${keyId}:${secret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(current.provider_subscription_id)}/cancel`, { method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify({ cancel_at_cycle_end: 1 }), cache: 'no-store', signal: AbortSignal.timeout(12_000) }).catch(() => null);
    if (!response?.ok) throw new HttpError(502, 'Razorpay could not process the cancellation. Your plan has not been changed.', 'PAYMENT_PROVIDER_ERROR');
    await query('UPDATE subscriptions SET cancel_at_period_end=TRUE,updated_at=NOW() WHERE id=$1 AND user_id=$2', [current.id, user.id]);
    await recordAudit(user.id, 'billing.cancellation_scheduled', 'subscription', current.provider_subscription_id);
    await recordEvent(user.id, 'subscription_cancelled', { scheduled: true });
    return NextResponse.json({ ok: true, message: 'Cancellation is scheduled for the end of your current billing period.' });
  } catch (error) {
    return errorResponse(error);
  }
}
