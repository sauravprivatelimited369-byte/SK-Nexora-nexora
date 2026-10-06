'use client';

import { useState } from 'react';
import { BadgeCheck, Check, CircleHelp, CreditCard, LoaderCircle, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Badge, Button, Card, ProgressBar } from './ui';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (response: Record<string, string>) => void) => void } }
}

type Plan = { id: string; name: string; monthly_price_paise: number; ai_request_limit: number; active_projects_limit: number | null; features: string; sort_order: number };
type Subscription = { status: string; current_period_end: string | null; cancel_at_period_end: boolean; provider: string } | null;

const descriptions: Record<string, string> = {
  free: 'A serious starting point for learning, practice, and your first projects.',
  pro: 'More room to build, with AI support across the engineering workflow.',
  career: 'Turn practical evidence into confident career preparation.',
};

export function PricingClient({ plans, currentPlan, currentPlanName, used, subscription, paymentConfigured }: { plans: Plan[]; currentPlan: string; currentPlanName: string; used: number; subscription: Subscription; paymentConfigured: boolean }) {
  const [busyPlan, setBusyPlan] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const activeSubscription = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status);
  const usagePercent = Math.round(Math.min(100, used / Math.max(plans.find((plan) => plan.id === currentPlan)?.ai_request_limit || 1, 1) * 100));

  async function startCheckout(planId: string) {
    setError(''); setSuccess(''); setBusyPlan(planId);
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to start checkout.');
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay checkout could not be loaded. Check your connection and retry.');
      const checkout = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'NEXORA',
        description: `${data.planName} monthly subscription`,
        image: '/icon.svg',
        prefill: {},
        notes: { platform: 'NEXORA' },
        theme: { color: '#c8f36c' },
        modal: { ondismiss: () => setBusyPlan('') },
        handler: async (result: Record<string, string>) => {
          try {
            const verify = await fetch('/api/billing/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscriptionId: result.razorpay_subscription_id || data.subscriptionId, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature }) });
            const verified = await verify.json(); if (!verify.ok) throw new Error(verified.error || 'Payment verification did not complete.');
            setSuccess(verified.message || 'Checkout completed. Your plan is updating.');
            setTimeout(() => window.location.reload(), 1600);
          } catch (e) { setError(e instanceof Error ? e.message : 'Payment verification failed.'); }
          finally { setBusyPlan(''); }
        },
      });
      checkout.on('payment.failed', (result) => { setError(result.error_description || 'The payment did not complete. No card details are stored by NEXORA.'); setBusyPlan(''); });
      checkout.open();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start checkout.'); setBusyPlan(''); }
  }

  async function cancelSubscription() {
    if (!window.confirm('Schedule cancellation at the end of your current billing period?')) return;
    setCancelBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST' }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to cancel your subscription.');
      setSuccess(data.message); setTimeout(() => window.location.reload(), 1400);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to cancel your subscription.'); }
    finally { setCancelBusy(false); }
  }

  return <>
    {error && <div className="form-alert form-alert--error pricing-alert" role="alert"><X size={15} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={13} /></button></div>}
    {success && <div className="form-alert form-alert--success pricing-alert" role="status"><Check size={15} />{success}</div>}
    <Card className="billing-current-card"><div className="billing-current-left"><span className="billing-current-icon"><CreditCard size={16} /></span><div><span className="card-eyebrow">CURRENT PLAN</span><strong>{currentPlanName}</strong><small>{subscription?.status === 'pending' ? 'Payment is awaiting provider confirmation.' : subscription?.cancel_at_period_end ? 'Cancellation scheduled at period end.' : currentPlan === 'free' ? 'No payment method required.' : `Managed by ${subscription?.provider || 'payment provider'}.`}</small></div></div><div className="billing-usage-meter"><div><span>AI requests this month</span><strong>{used} / {plans.find((plan) => plan.id === currentPlan)?.ai_request_limit ?? 25}</strong></div><ProgressBar value={usagePercent} color={usagePercent >= 85 ? 'orange' : 'lime'} /><small>Resets at the start of each calendar month · successful AI requests only</small></div>{activeSubscription && !subscription?.cancel_at_period_end && <Button variant="ghost" size="sm" className="billing-cancel-button" disabled={cancelBusy} onClick={() => void cancelSubscription()}>{cancelBusy ? <LoaderCircle className="spin-icon" size={13} /> : <X size={13} />} Cancel at period end</Button>}</Card>
    {subscription?.cancel_at_period_end && <div className="billing-cancel-notice"><CircleHelp size={14} /><span>Your paid access remains active until the provider confirms the end of the billing period{subscription.current_period_end ? ` (${new Date(subscription.current_period_end).toLocaleDateString()})` : ''}.</span></div>}
    <div className="pricing-card-grid">{plans.map((plan) => {
      const features = JSON.parse(plan.features || '[]') as string[];
      const isCurrent = plan.id === currentPlan;
      const isPopular = plan.id === 'pro';
      const isPaid = plan.monthly_price_paise > 0;
      const isBusy = busyPlan === plan.id;
      return <Card className={`pricing-plan-card${isPopular ? ' pricing-plan-card--popular' : ''}${isCurrent ? ' pricing-plan-card--current' : ''}`} key={plan.id}>{isPopular && <div className="pricing-popular-ribbon"><Sparkles size={11} /> MOST POPULAR</div>}<div className="pricing-plan-head"><span className={`pricing-plan-symbol pricing-symbol--${plan.id}`}>{plan.id === 'free' ? <CompassIcon /> : plan.id === 'pro' ? <Sparkles size={17} /> : <BadgeCheck size={17} />}</span>{isCurrent && <Badge tone="lime">CURRENT</Badge>}</div><h2>{plan.name}</h2><p>{descriptions[plan.id] || 'An engineering workspace for your team.'}</p><div className="pricing-price">{isPaid ? <>₹{Math.round(plan.monthly_price_paise / 100).toLocaleString('en-IN')}<small>/month</small></> : <>₹0<small>/month</small></>}</div><div className="pricing-ai-limit"><Sparkles size={13} /> {plan.ai_request_limit.toLocaleString()} AI requests / month <span>·</span> {plan.active_projects_limit === null ? 'Unlimited projects' : `${plan.active_projects_limit} active projects`}</div><div className="pricing-feature-list">{features.map((feature) => <div key={feature}><span><Check size={12} /></span>{feature}</div>)}</div><div className="pricing-plan-bottom">{isCurrent ? <Button variant="secondary" disabled className="pricing-plan-button"><Check size={14} /> Your current plan</Button> : isPaid ? <Button onClick={() => void startCheckout(plan.id)} disabled={!paymentConfigured || !!busyPlan} className="pricing-plan-button">{isBusy ? <><LoaderCircle className="spin-icon" size={14} /> Opening secure checkout…</> : paymentConfigured ? <>Choose {plan.name} <ArrowRightIcon /></> : <>Checkout not configured <CircleHelp size={13} /></>}</Button> : <Button variant="secondary" disabled className="pricing-plan-button">Included by default</Button>}</div>{isPaid && !paymentConfigured && <small className="pricing-config-note">Razorpay recurring plan IDs and server keys are required for live checkout.</small>}{isPaid && <div className="pricing-provider-note"><ShieldCheck size={12} /> Card details are handled by Razorpay, never stored by NEXORA.</div>}</Card>;
    })}</div>
    <div className="pricing-config-banner"><span><CircleHelp size={15} /></span><p><strong>{paymentConfigured ? 'Payments are configured.' : 'Live billing needs your provider configuration.'}</strong> {paymentConfigured ? 'Razorpay handles checkout and webhooks; activate billing only after the provider confirms the subscription.' : 'Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, and the monthly plan IDs on the server. Checkout stays disabled until then.'}</p></div>
  </>;
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', () => reject(new Error('Razorpay checkout could not be loaded.')), { once: true }); return; }
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Razorpay checkout could not be loaded.')); document.body.appendChild(script);
  });
}
function CompassIcon() { return <span>◎</span>; }
function ArrowRightIcon() { return <span aria-hidden="true">→</span>; }
