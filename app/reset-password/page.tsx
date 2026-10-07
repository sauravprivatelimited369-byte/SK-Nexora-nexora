'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Brand } from '@/components/brand';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get('token') || ''); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('The passwords don’t match.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to reset password.');
      router.push('/login?reset=1');
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout auth-layout--compact"><section className="auth-story-panel"><Link href="/" className="auth-brand"><Brand /></Link><div className="auth-story-content"><span className="auth-story-kicker">SECURE ACCOUNT RECOVERY</span><h1>A fresh key.<br /><span>Same momentum.</span></h1><p>Use a unique password you don’t use on other sites. NEXORA will sign out all active sessions after this change.</p></div><div className="auth-story-bottom"><div className="auth-story-line" /><span>From Learning to Building.</span></div></section><section className="auth-form-panel"><div className="auth-form-wrap"><Link href="/login" className="auth-back-link"><ArrowLeft size={15} /> Back to sign in</Link><span className="auth-eyebrow">NEW PASSWORD</span><h2>Choose a new password</h2><p className="auth-form-intro">Your reset link is single-use and expires after one hour.</p>{error && <div className="form-alert form-alert--error" role="alert">{error}</div>}<form className="auth-form" onSubmit={submit}><label>New password<div className="field-wrap field-wrap--password"><input required type={show ? 'text' : 'password'} minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><label>Confirm password<div className="field-wrap"><input required type={show ? 'text' : 'password'} minLength={10} maxLength={128} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Enter it again" /></div></label><button className="button button--primary button--lg auth-submit" disabled={busy || !token}>{busy ? <><span className="spinner" /> Saving…</> : <>Update password <ArrowRight size={16} /></>}</button>{!token && <p className="form-field-note">No reset token was found. <Link href="/forgot-password">Request another reset link</Link>.</p>}</form></div><div className="auth-mobile-brand"><Brand compact /><span>Secure, private, yours.</span></div></section></main>;
}
