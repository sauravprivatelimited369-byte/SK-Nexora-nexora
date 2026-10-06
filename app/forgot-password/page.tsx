'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start account recovery.');
      setMessage(result.message); setDevLink(result.devResetUrl || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout auth-layout--compact"><section className="auth-story-panel"><Link href="/" className="auth-brand"><Brand /></Link><div className="auth-story-content"><span className="auth-story-kicker"><ShieldCheck size={14} /> ACCOUNT SECURITY</span><h1>Back to your<br /><span>next step.</span></h1><p>Reset links are single-use and expire after one hour. Your current password stays private from NEXORA.</p></div><div className="auth-story-bottom"><div className="auth-story-line" /><span>From Learning to Building.</span></div></section><section className="auth-form-panel"><div className="auth-form-wrap"><Link href="/login" className="auth-back-link"><ArrowLeft size={15} /> Back to sign in</Link><span className="auth-eyebrow">ACCOUNT RECOVERY</span><h2>Reset your password</h2><p className="auth-form-intro">Enter the email tied to your workspace and we’ll send a secure link.</p>{error && <div className="form-alert form-alert--error" role="alert">{error}</div>}{message && <div className="form-alert form-alert--success" role="status"><Mail size={16} /> {message}</div>}<form className="auth-form" onSubmit={submit}><label>Email address<div className="field-wrap"><input type="email" required autoComplete="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} /></div></label><button disabled={busy} className="button button--primary button--lg auth-submit">{busy ? <><span className="spinner" /> Sending…</> : <>Send reset link <ArrowRight size={16} /></>}</button></form>{devLink && <div className="dev-reset-link"><span>Local development reset link</span><a href={devLink}>Open password reset <ArrowRight size={13} /></a></div>}<p className="auth-switch">Need an account? <Link href="/register">Create a free workspace</Link></p></div><div className="auth-mobile-brand"><Brand compact /><span>Secure, private, yours.</span></div></section></main>;
}
