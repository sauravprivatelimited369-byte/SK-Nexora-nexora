import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getMonthlyUsage, getPlanForUser } from '@/lib/ai';
import { SettingsPanel } from '@/components/settings-panel';

export const metadata = { title: 'Settings & privacy' };

type SettingsRow = { username: string | null; notification_preferences: string };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const [profile, plan, usage, subscriptions] = await Promise.all([
    query<SettingsRow>('SELECT username,notification_preferences FROM profiles WHERE user_id=$1', [user.id]),
    getPlanForUser(user.id), getMonthlyUsage(user.id),
    query<{ status: string; current_period_end: string | null; cancel_at_period_end: boolean }>("SELECT status,current_period_end,cancel_at_period_end FROM subscriptions WHERE user_id=$1 AND status IN ('active','trialing','past_due','pending') ORDER BY created_at DESC LIMIT 1", [user.id]),
  ]);
  let notifications = { learning: true, projects: true, product: true };
  try { notifications = { ...notifications, ...JSON.parse(profile.rows[0]?.notification_preferences || '{}') }; } catch { /* keep default preferences */ }
  let technologies: string[] = [];
  try { technologies = JSON.parse(user.technologies || '[]'); } catch { technologies = []; }
  return <div className="page-stack settings-page"><div className="page-hero-row"><div><div className="page-kicker">ACCOUNT <span className="page-kicker-divider">·</span> SETTINGS & PRIVACY</div><h1>Your workspace,<br />your rules<span className="welcome-period">.</span></h1><p className="dashboard-intro">Manage your account, privacy, notifications, and the data you’ve built in NEXORA.</p></div><div className="settings-privacy-indicator"><span /><span>PRIVATE BY DEFAULT</span></div></div><SettingsPanel user={{ id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: Boolean(user.email_verified_at), branch: user.branch, currentYear: user.current_year, skillLevel: user.skill_level, goal: user.primary_goal, technologies, weeklyHours: user.weekly_hours, username: profile.rows[0]?.username || user.username }} notifications={notifications} plan={{ name: plan.name, id: plan.id, used: usage, limit: plan.ai_request_limit }} subscription={subscriptions.rows[0] || null} /></div>;
}
