'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { Brand } from '@/components/brand';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState(false);
  const strength = form.password.length >= 14 ? 3 : form.password.length >= 10 ? 2 : form.password.length >= 6 ? 1 : 0;

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create your account.');
      if (result.requiresVerification) { setVerification(true); return; }
      router.push('/onboarding'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-layout">
    <section className="auth-story-panel"><Link href="/" className="auth-brand"><Brand /></Link><div className="auth-story-content"><span className="auth-story-kicker"><Sparkles size={14} /> YOUR ENGINEERING JOURNEY, CONNECTED</span><h1>Build a career<br />you can <span>show.</span></h1><p>Not another course library. A workspace that connects what you learn to what you build—and what comes next.</p><div className="auth-story-flow"><span>LEARN</span><i>→</i><span>PRACTICE</span><i>→</i><span>BUILD</span><i>→</i><span>SHOW</span></div></div><div className="auth-story-bottom"><div className="auth-story-line" /><span>From Learning to Building.</span></div><div className="auth-grid-decoration" /></section>
    <section className="auth-form-panel"><div className="auth-form-wrap">
      <Link href="/" className="auth-back-link"><ArrowLeft size={15} /> Back to NEXORA</Link>
      {verification ? <div className="auth-success-state"><span className="auth-success-icon"><Check size={22} /></span><span className="auth-eyebrow">ONE LAST STEP</span><h2>Check your inbox.</h2><p>We’ve sent a verification link to <strong>{form.email}</strong>. Open it to activate your account, then sign in to set up your workspace.</p><div className="auth-success-note"><ShieldCheck size={16} />The link expires in 24 hours. If it doesn’t arrive, check your spam folder.</div><Link className="button button--primary button--lg auth-submit-link" href="/login">Continue to sign in <ArrowRight size={16} /></Link></div> : <>
        <span className="auth-eyebrow">START WITH A FREE WORKSPACE</span><h2>Create your account</h2><p className="auth-form-intro">Make your learning visible. Your progress and projects stay yours.</p>
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label>Full name<div className="field-wrap"><input required minLength={2} maxLength={80} autoComplete="name" placeholder="e.g. Alex Morgan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div></label>
          <label>Email address<div className="field-wrap"><input required type="email" autoComplete="email" placeholder="you@university.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></label>
          <label>Password<div className="field-wrap field-wrap--password"><input required type={showPassword ? 'text' : 'password'} minLength={10} maxLength={128} autoComplete="new-password" placeholder="At least 10 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><span className="password-hint"><span className={`password-meter password-meter--${strength}`}><i /><i /><i /></span>Use at least 10 characters</span></label>
          <button className="button button--primary button--lg auth-submit" disabled={busy}>{busy ? <><span className="spinner" /> Creating workspace…</> : <>Create free account <ArrowRight size={16} /></>}</button>
        </form>
        <div className="auth-legal-note"><LockKeyhole size={13} /><span>Your data is private. We never publish your projects without your permission.</span></div>
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
      </>}
    </div><div className="auth-mobile-brand"><Brand compact /><span>Secure, private, yours.</span></div></section>
  </main>;
}
