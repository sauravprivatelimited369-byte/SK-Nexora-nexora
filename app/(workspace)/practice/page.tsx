import { Activity, BrainCircuit, Gauge, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { PracticeSession } from '@/components/practice-session';

export const metadata = { title: 'Adaptive practice' };

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const topicSlug = params.topic?.slice(0, 100);
  const topic = topicSlug ? await query<{ title: string; summary: string }>('SELECT title,summary FROM topics WHERE slug=$1 OR id=$1', [topicSlug]) : null;
  return <div className="page-stack practice-page"><div className="page-hero-row"><div><div className="page-kicker"><Activity size={13} /> PRACTICE ENGINE <span className="page-kicker-divider">·</span> ADAPTIVE</div><h1>Practice with intent<span className="welcome-period">.</span></h1><p className="dashboard-intro">Questions adjust to your recent results. Misses get a simpler explanation and a gentler next step.</p></div><div className="practice-proof"><span><BrainCircuit size={15} /></span><div><strong>Adaptive by evidence</strong><small>Questions served from a curated bank</small></div></div></div><div className="practice-method-note"><Sparkles size={14} /><span>Mastery is a recency-weighted estimate from your submitted answers—not a certification. Difficulty adjusts using your last five attempts on a topic.</span></div><PracticeSession topicSlug={topic?.rows[0] ? topicSlug : undefined} initialTopic={topic?.rows[0] || null} /></div>;
}
