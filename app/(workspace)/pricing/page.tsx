import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, CreditCard, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getPlanForUser, getMonthlyUsage } from '@/lib/ai';
import { PricingClient } from '@/components/pricing-client';

export const metadata = { title: 'Plans & billing' };

type Plan = { id: string; name: string; monthly_price_paise: number; ai_request_limit: number; active_projects_limit: number | null; features: string; sort_order: number };

export default async function PricingPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [plans, current, usage, subscription] = await Promise.all([
    query<Plan>('SELECT id,name,monthly_price_paise,ai_request_limit,active_projects_limit,features,sort_order FROM plans WHERE is_active=TRUE ORDER BY sort_order'),
    getPlanForUser(user.id), getMonthlyUsage(user.id),
    query<{ status: string; current_period_end: string | null; cancel_at_period_end: boolean; provider: string }>("SELECT status,current_period_end,cancel_at_period_end,provider FROM subscriptions WHERE user_id=$1 AND status IN ('active','trialing','past_due','pending') ORDER BY created_at DESC LIMIT 1", [user.id]),
  ]);
  const configured = Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim() && process.env.RAZORPAY_PRO_PLAN_ID?.trim() && process.env.RAZORPAY_CAREER_PLAN_ID?.trim());
  return <div className="page-stack pricing-page"><div className="page-hero-row"><div><div className="page-kicker"><CreditCard size={13} /> PLANS & BILLING <span className="page-kicker-divider">·</span> NO SURPRISES</div><h1>Invest in your next step<span className="welcome-period">.</span></h1><p className="dashboard-intro">Start free. Upgrade when you’re ready for deeper AI support and career intelligence.</p></div><div className="pricing-trust-chip"><ShieldCheck size={14} /> Secure provider-hosted checkout</div></div><PricingClient plans={plans.rows} currentPlan={current.id} currentPlanName={current.name} used={usage} subscription={subscription.rows[0] || null} paymentConfigured={configured} /><div className="pricing-college-banner"><span className="college-banner-icon"><Building2 size={17} /></span><div><span className="card-eyebrow">FOR ENGINEERING INSTITUTIONS</span><h2>Bring the workspace to your campus.</h2><p>College conversations start with your department, student count, privacy requirements, and placement goals.</p></div><a className="button button--secondary button--sm" href="mailto:colleges@nexora.app?subject=NEXORA%20College%20Workspace">Discuss a college plan <ArrowRight size={13} /></a></div><div className="pricing-footnotes"><span><BadgeCheck size={13} /> Plans are configurable in the database; pricing is shown in INR.</span><span><Zap size={13} /> AI usage is metered only after a successful provider response.</span></div></div>;
}
