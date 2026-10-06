import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, recordAudit, requestIp } from '@/lib/api';
import { query } from '@/lib/db';

const schema = z.object({ planId: z.enum(['pro', 'career']) });
const razorpayPlanEnv: Record<string, string | undefined> = { pro: process.env.RAZORPAY_PRO_PLAN_ID, career: process.env.RAZORPAY_CAREER_PLAN_ID };

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in before starting a subscription.', 'UNAUTHENTICATED');
    await enforceRateLimit(user.id, 'billing-checkout', 5, 60 * 60);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Choose a valid subscription plan.', 'INVALID_INPUT');
    const planId = parsed.data.planId;
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    const providerPlanId = razorpayPlanEnv[planId]?.trim();
    if (!keyId || !secret || !providerPlanId) throw new HttpError(503, 'Razorpay is not fully configured for this plan. No payment was started.', 'PAYMENTS_NOT_CONFIGURED');
    const active = await query('SELECT id FROM subscriptions WHERE user_id=$1 AND status IN (\'active\',\'trialing\') AND plan_id=$2 AND (current_period_end IS NULL OR current_period_end>NOW())', [user.id, planId]);
    if (active.rowCount) throw new HttpError(409, 'You already have this plan active.', 'PLAN_ALREADY_ACTIVE');
    const plan = await query<{ name: string; monthly_price_paise: number }>('SELECT name,monthly_price_paise FROM plans WHERE id=$1 AND is_active=TRUE', [planId]);
    if (!plan.rows[0]) throw new HttpError(404, 'This plan is not available.', 'PLAN_NOT_FOUND');
    const auth = Buffer.from(`${keyId}:${secret}`).toString('base64');
    const providerResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
      body: JSON.stringify({ plan_id: providerPlanId, total_count: 12, quantity: 1, customer_notify: 1, notes: { nexora_user_id: user.id, nexora_plan_id: planId } }),
      cache: 'no-store', signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!providerResponse) throw new HttpError(502, 'Razorpay could not be reached. No payment was started.', 'PAYMENT_PROVIDER_UNAVAILABLE');
    const providerData = await providerResponse.json().catch(() => ({})) as { id?: string; status?: string; short_url?: string; error?: { description?: string } };
    if (!providerResponse.ok || !providerData.id) {
      console.error('[nexora] Razorpay subscription create failed', providerResponse.status, providerData.error?.description || 'Unknown error');
      throw new HttpError(502, 'Razorpay could not create the subscription. Please try again later.', 'PAYMENT_PROVIDER_ERROR');
    }
    await query('INSERT INTO subscriptions (id,user_id,plan_id,provider,provider_subscription_id,status,current_period_start) VALUES ($1,$2,$3,$4,$5,$6,NOW())', [randomUUID(), user.id, planId, 'razorpay', providerData.id, 'pending']);
    await recordAudit(user.id, 'billing.checkout_created', 'subscription', providerData.id, { plan: planId }, requestIp(request));
    return NextResponse.json({ ok: true, subscriptionId: providerData.id, keyId, planName: plan.rows[0].name, amountPaise: Number(plan.rows[0].monthly_price_paise), currency: 'INR', checkoutUrl: providerData.short_url || null });
  } catch (error) {
    return errorResponse(error);
  }
}
