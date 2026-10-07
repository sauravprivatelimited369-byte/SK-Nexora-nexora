'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, Bell, Check, ChevronRight, CircleHelp, CreditCard, Eye, FileText, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { Badge, Button, Card } from './ui';

type NotificationPrefs = { learning: boolean; projects: boolean; product: boolean };
type UserData = { id: string; name: string; email: string; role: string; emailVerified: boolean; branch: string | null; currentYear: string | null; skillLevel: string | null; goal: string | null; technologies: string[]; weeklyHours: string | null; username: string | null };
type Subscription = { status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null;

export function SettingsPanel({ user, notifications: initialNotifications, plan, subscription }: { user: UserData; notifications: NotificationPrefs; plan: { name: string; id: string; used: number; limit: number }; subscription: Subscription }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setSaveBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, notifications }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save settings.');
      setNotice('Account settings saved.'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save settings.'); }
    finally { setSaveBusy(false); }
  }
  async function saveNotifications() {
    setNotificationBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, notifications }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save notification preferences.');
      setNotice('Notification preferences saved.'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save notification preferences.'); }
    finally { setNotificationBusy(false); }
  }
  async function changePassword(event: FormEvent) {
    event.preventDefault(); setPasswordBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/account/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update password.');
      setCurrentPassword(''); setNewPassword(''); setNotice('Password updated. Other active sessions have been signed out.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update password.'); }
    finally { setPasswordBusy(false); }
  }
  async function deleteAccount(event: FormEvent) {
    event.preventDefault(); setDeleting(true); setError('');
    try {
      const response = await fetch('/api/account', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmation }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete the account.');
      router.push('/?deleted=1'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete the account.'); setDeleting(false); }
  }

  return <div className="settings-panel-layout"><div className="settings-sections-column">{notice && <div className="form-alert form-alert--success" role="status"><Check size={14} />{notice}</div>}{error && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={14} />{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={13} /></button></div>}
    <form onSubmit={saveSettings}><Card className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon"><UserRound size={16} /></span><div><span className="card-eyebrow">ACCOUNT PROFILE</span><h2>Personal details.</h2><p>Used to personalize your workspace and private resume draft.</p></div><Badge tone={user.emailVerified ? 'lime' : 'orange'}>{user.emailVerified ? 'EMAIL VERIFIED' : 'EMAIL NOT VERIFIED'}</Badge></div><div className="settings-fields-grid"><label>Full name<input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} /></label><label>Email address<div className="settings-readonly-field"><span>{user.email}</span><LockKeyhole size={13} /></div><small>Email changes require a verified email flow.</small></label><label>Account role<div className="settings-readonly-field"><span>{user.role}</span><ShieldCheck size={13} /></div></label><label>Portfolio username<div className="settings-readonly-field"><span>{user.username ? `nexora.app/u/${user.username}` : 'Not set'}</span><Eye size={13} /></div></label></div><div className="settings-profile-summary"><span className="card-eyebrow">ENGINEERING PROFILE</span><div><span>{user.branch || 'Branch not set'}</span><i>·</i><span>{user.currentYear || 'Study stage not set'}</span><i>·</i><span>{user.skillLevel || 'Skill level not set'}</span></div><div><span>{user.goal || 'Goal not set'}</span><i>·</i><span>{user.weeklyHours || 'Weekly time not set'}</span></div><div className="settings-tech-pills">{user.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div><p>Selected technologies are self-reported. Manage public profile visibility in <Link href="/portfolio">Portfolio settings <ArrowRight size={12} /></Link>.</p></div><div className="settings-card-footer"><span>Changes update your profile and dashboard.</span><Button type="submit" size="sm" disabled={saveBusy}>{saveBusy ? <><LoaderCircle className="spin-icon" size={13} /> Saving…</> : <>Save profile <Check size={13} /></>}</Button></div></Card></form>

    <Card className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--blue"><Bell size={16} /></span><div><span className="card-eyebrow">NOTIFICATIONS</span><h2>Choose what reaches you.</h2><p>Preferences are saved with your account. Email delivery requires a configured mail provider.</p></div></div><div className="settings-notification-list"><NotificationOption label="Learning reminders" detail="Topic progress and planned study nudges" checked={notifications.learning} onChange={(value) => setNotifications({ ...notifications, learning: value })} /><NotificationOption label="Project milestones" detail="Task completion and project activity" checked={notifications.projects} onChange={(value) => setNotifications({ ...notifications, projects: value })} /><NotificationOption label="Product updates" detail="Security, billing, and product announcements" checked={notifications.product} onChange={(value) => setNotifications({ ...notifications, product: value })} /></div><div className="settings-notifications-footer"><p className="settings-inline-hint"><CircleHelp size={12} /> In-app notification delivery is being added; these preferences persist now.</p><Button type="button" variant="secondary" size="sm" disabled={notificationBusy} onClick={() => void saveNotifications()}>{notificationBusy ? <><LoaderCircle className="spin-icon" size={13} /> Saving…</> : <>Save preferences <Check size={13} /></>}</Button></div></Card>

    <Card className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--purple"><KeyRound size={16} /></span><div><span className="card-eyebrow">SECURITY</span><h2>Change password.</h2><p>Changing it signs out your other active sessions.</p></div></div><form className="settings-password-form" onSubmit={changePassword}><label>Current password<input className="input" type="password" autoComplete="current-password" minLength={1} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label>New password<input className="input" type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 10 characters" /></label><Button type="submit" variant="secondary" size="sm" disabled={passwordBusy}>{passwordBusy ? <><LoaderCircle className="spin-icon" size={13} /> Updating…</> : <>Update password <ArrowRight size={13} /></>}</Button></form><div className="settings-security-foot"><ShieldCheck size={13} /> Passwords are stored as scrypt hashes; NEXORA never stores your raw password.</div></Card>

    <Card className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--lime"><CreditCard size={16} /></span><div><span className="card-eyebrow">BILLING</span><h2>Your {plan.name} plan.</h2><p>{plan.used} of {plan.limit} AI requests used this month.</p></div><Link href="/pricing" className="settings-heading-link">Manage plan <ChevronRight size={14} /></Link></div><div className="settings-billing-row"><span className="billing-status-dot" /><div><strong>{subscription?.status === 'pending' ? 'Payment pending' : subscription?.cancel_at_period_end ? 'Cancellation scheduled' : plan.id === 'free' ? 'Free plan active' : `${plan.name} plan active`}</strong><small>{subscription?.current_period_end ? `Current period ends ${new Date(subscription.current_period_end).toLocaleDateString()}` : 'No payment method required for Free.'}</small></div><Link href="/pricing">Compare plans <ArrowRight size={13} /></Link></div></Card>

    <Card className="settings-card settings-data-card"><div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--orange"><ShieldCheck size={16} /></span><div><span className="card-eyebrow">DATA & PRIVACY</span><h2>Your data stays yours.</h2><p>Private workspace content is available only to your authenticated account.</p></div></div><div className="settings-data-links"><Link href="/portfolio"><span><Eye size={14} /> Public visibility controls</span><ArrowRight size={13} /></Link><Link href="/resume"><span><FileText size={14} /> Private resume draft</span><ArrowRight size={13} /></Link><Link href="/projects"><span><BriefcaseIcon /> Private project workspaces</span><ArrowRight size={13} /></Link></div></Card>

    <Card className="settings-danger-card"><div className="settings-danger-heading"><span className="settings-danger-icon"><Trash2 size={15} /></span><div><span className="card-eyebrow">DANGER ZONE</span><h2>Delete your account.</h2><p>Delete your account and private learning, project, skill, AI conversation, and resume data. This cannot be undone.</p></div><button className="settings-danger-open" onClick={() => setDeleteOpen(!deleteOpen)}>{deleteOpen ? 'Cancel' : 'Delete account'} {deleteOpen ? <X size={13} /> : <ArrowRight size={13} />}</button></div>{deleteOpen && <form className="delete-account-form" onSubmit={deleteAccount}><div className="delete-warning"><AlertTriangle size={14} /> This permanently deletes your account and cascades associated private content. Public portfolios are removed too. Billing cancellation may require provider confirmation.</div><label>Current password<input className="input" type="password" required autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} /></label><label>Type <code>DELETE</code> to confirm<input className="input" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} autoComplete="off" /></label><Button variant="danger" type="submit" disabled={deleting || deleteConfirmation !== 'DELETE'}>{deleting ? <><LoaderCircle className="spin-icon" size={13} /> Deleting…</> : <>Permanently delete account <Trash2 size={13} /></>}</Button></form>}</Card>
    </div><aside className="settings-aside-column"><Card className="settings-identity-card"><span className="settings-large-avatar">{user.name.slice(0, 1).toUpperCase()}</span><h3>{user.name}</h3><p>{user.email}</p><span className="settings-identity-branch">{user.branch || 'Engineering workspace'}</span><div className="settings-identity-divider" /><div><span>ROLE</span><b>{user.role}</b></div><div><span>PLAN</span><b>{plan.name}</b></div><Link href="/dashboard">Return to workspace <ArrowRight size={13} /></Link></Card><div className="settings-aside-note"><ShieldCheck size={14} /><p><strong>Secure by default.</strong> Session cookies are HTTP-only. Private resources are always scoped to your account.</p></div><div className="settings-aside-note settings-aside-note--muted"><CircleHelp size={14} /><p>Need help with access or billing? <a href="mailto:support@nexora.app">Contact support</a>.</p></div></aside></div>;
}

function NotificationOption({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="notification-option"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="notification-switch" /></label>;
}
function BriefcaseIcon() { return <span aria-hidden="true">▱</span>; }
