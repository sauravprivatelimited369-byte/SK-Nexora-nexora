import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { Brand } from '@/components/brand';

export default function NotFound() {
  return <main className="not-found-page"><div className="not-found-card"><Link href="/" className="not-found-brand"><Brand /></Link><span className="not-found-mark"><Compass size={18} /></span><span className="card-eyebrow">404 · WRONG TURN</span><h1>This page isn’t in your path.</h1><p>It may have moved, or it may be private to another workspace. Your account data stays private by design.</p><div className="error-page-actions"><Link className="button button--primary" href="/">Go to NEXORA <ArrowLeft size={14} /></Link><Link className="button button--secondary" href="/login">Sign in</Link></div></div></main>;
}
