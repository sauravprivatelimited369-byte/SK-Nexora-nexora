'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[nexora] page error', error); }, [error]);
  return <main className="error-page"><div className="error-page-card"><span className="error-page-mark"><AlertTriangle size={18} /></span><span className="card-eyebrow">WORKSPACE ERROR</span><h1>That didn’t go to plan.</h1><p>Your data hasn’t been changed by this screen. Retry the page or return to your workspace.</p><div className="error-page-actions"><button className="button button--primary" onClick={() => reset()}><RotateCcw size={14} /> Retry</button><Link className="button button--secondary" href="/dashboard"><ArrowLeft size={14} /> Dashboard</Link></div></div></main>;
}
