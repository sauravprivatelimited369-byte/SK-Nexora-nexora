'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { Brand } from '@/components/brand';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') setNotice('Email verified. Your engineering workspace is ready.');
    if (params.get('error') === 'invalid-verification') setError('That verification link is invalid or has expired. Contact support to request another one.');
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      const session = await fetch('/api/auth/me');
      const { user } = await session.json();
      router.push(user?.onboarding_complete ? '/dashboard' : '/onboarding'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-layout">
    <section className="auth-story-panel"><Link href="/" className="auth-brand"><Brand /></Link><div className="auth-story-content"><span className="auth-story-kicker"><Sparkles size={14} /> YOUR ENGINEERING JOURNEY, CONNECTED</span><h1>Pick up right<br />where you <span>left off.</span></h1><p>Your roadmap, practice history, projects, and skill evidence—back in one place and ready for the next step.</p><div className="auth-story-stat-row"><div><b>01</b><span>Study with intent</span></div><div><b>02</b><span>Build real things</span></div><div><b>03</b><span>Make growth visible</span></div></div></div><div className="auth-story-bottom"><div className="auth-story-line" /><span>From Learning to Building.</span></div><div className="auth-grid-decoration" /></section>
    <section className="auth-form-panel"><div className="auth-form-wrap"><Link href="/" className="auth-back-link"><ArrowLeft size={15} /> Back to NEXORA</Link><span className="auth-eyebrow">WELCOME BACK</span><h2>Sign in to NEXORA</h2><p className="auth-form-intro">Your next step is waiting in your workspace.</p>
      {notice && <div className="form-alert form-alert--success" role="status">{notice}</div>}{error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      <form className="auth-form" onSubmit={submit}><label>Email address<div className="field-wrap"><input required type="email" autoComplete="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} /></div></label><label>Password<div className="field-wrap field-wrap--password"><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><div className="auth-forgot-row"><span><LockKeyhole size={12} /> Private workspace</span><Link href="/forgot-password">Forgot password?</Link></div><button className="button button--primary button--lg auth-submit" disabled={busy}>{busy ? <><span className="spinner" /> Signing in…</> : <>Sign in <ArrowRight size={16} /></>}</button></form><p className="auth-switch">New to NEXORA? <Link href="/register">Create a free account</Link></p></div><div className="auth-mobile-brand"><Brand compact /><span>Secure, private, yours.</span></div></section>
  </main>;
}
