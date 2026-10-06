import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordAudit, recordEvent } from '@/lib/api';
import { query, transaction } from '@/lib/db';

const schema = z.object({ subscriptionId: z.string().min(4).max(100), paymentId: z.string().min(4).max(100), signature: z.string().regex(/^[a-f0-9]{64}$/i) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to verify the payment.', 'UNAUTHENTICATED');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Payment details could not be verified.', 'INVALID_INPUT');
    const { subscriptionId, paymentId, signature } = parsed.data;
    const local = await query<{ id: string; plan_id: string; status: string }>('SELECT id,plan_id,status FROM subscriptions WHERE user_id=$1 AND provider_subscription_id=$2 AND provider=$3', [user.id, subscriptionId, 'razorpay']);
    if (!local.rows[0]) throw new HttpError(404, 'This subscription does not belong to your account.', 'NOT_FOUND');
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!secret) throw new HttpError(503, 'Payment verification is not configured.', 'PAYMENTS_NOT_CONFIGURED');
    const expected = createHmac('sha256', secret).update(`${paymentId}|${subscriptionId}`).digest();
    const received = Buffer.from(signature, 'hex');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new HttpError(400, 'The payment signature could not be verified. Contact support before retrying.', 'PAYMENT_SIGNATURE_INVALID');

    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const auth = Buffer.from(`${keyId}:${secret}`).toString('base64');
    const providerResponse = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, { headers: { authorization: `Basic ${auth}` }, cache: 'no-store', signal: AbortSignal.timeout(12_000) }).catch(() => null);
    if (!providerResponse?.ok) throw new HttpError(502, 'Payment signature is valid, but the provider status could not be confirmed. Your plan will update when Razorpay sends its verified webhook.', 'PAYMENT_STATUS_PENDING');
    const provider = await providerResponse.json() as { status?: string; current_start?: number; current_end?: number };
    const active = provider.status === 'active';
    const start = provider.current_start ? new Date(provider.current_start * 1000).toISOString() : new Date().toISOString();
    const end = provider.current_end ? new Date(provider.current_end * 1000).toISOString() : null;
    const amount = await query<{ monthly_price_paise: number }>('SELECT monthly_price_paise FROM plans WHERE id=$1', [local.rows[0].plan_id]);
    await transaction(async (tx) => {
      await tx('UPDATE subscriptions SET status=$1,current_period_start=$2,current_period_end=COALESCE($3,current_period_end),updated_at=NOW() WHERE id=$4 AND user_id=$5', [active ? 'active' : 'pending', start, end, local.rows[0].id, user.id]);
      await tx('INSERT INTO payments (id,user_id,subscription_id,provider,provider_payment_id,amount_paise,currency,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (provider_payment_id) DO NOTHING', [randomUUID(), user.id, local.rows[0].id, 'razorpay', paymentId, Number(amount.rows[0]?.monthly_price_paise ?? 0), 'INR', active ? 'verified' : 'authorized']);
    });
    await recordAudit(user.id, active ? 'billing.subscription_activated' : 'billing.payment_authorized', 'subscription', subscriptionId, { provider_status: provider.status });
    if (active) await recordEvent(user.id, 'subscription_started', { plan: local.rows[0].plan_id });
    return NextResponse.json({ ok: true, active, providerStatus: provider.status || 'unknown', message: active ? 'Your subscription is active.' : 'Payment details are verified. Your plan will unlock when the provider confirms activation.' });
  } catch (error) {
    return errorResponse(error);
  }
}
