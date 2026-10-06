import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2, Clock3, ExternalLink, Lightbulb, ListChecks, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAiConfigured } from '@/lib/ai';
import { TopicStudyActions } from '@/components/topic-study-actions';
import { Badge, Card } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await query<{ title: string; summary: string }>('SELECT title,summary FROM topics WHERE slug=$1', [slug]);
  return result.rows[0] ? { title: result.rows[0].title, description: result.rows[0].summary } : { title: 'Learning topic' };
}

type Lesson = { id: string; title: string; slug: string; summary: string; level: string; duration_minutes: number; content: string; objectives: string; branch: string; subject: string; status: string | null; completion_percent: number | null };
type Resource = { id: string; title: string; kind: string; url: string; description: string };

function InlineContent({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/g).map((part, index) => part.startsWith('`') && part.endsWith('`') ? <code key={index}>{part.slice(1, -1)}</code> : <span key={index}>{part}</span>)}</>;
}

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { slug } = await params;
  const result = await query<Lesson>(
    `SELECT t.id,t.title,t.slug,t.summary,t.level,t.duration_minutes,t.content,t.objectives,s.branch,s.name AS subject,
      up.status,up.completion_percent FROM topics t JOIN subjects s ON s.id=t.subject_id
      LEFT JOIN user_progress up ON up.topic_id=t.id AND up.user_id=$1 WHERE t.slug=$2`,
    [user.id, slug],
  );
  const topic = result.rows[0];
  if (!topic) notFound();
  const resources = await query<Resource>('SELECT id,title,kind,url,description FROM resources WHERE topic_id=$1 ORDER BY title', [topic.id]);
  const objectives = JSON.parse(topic.objectives || '[]') as string[];
  const blocks = topic.content.split(/\n\s*\n/).filter(Boolean);
  return <div className="page-stack topic-detail-page">
    <div className="topic-breadcrumb"><Link href="/learn"><ArrowLeft size={13} /> Learning library</Link><span>/</span><span>{topic.branch}</span><span>/</span><strong>{topic.subject}</strong></div>
    <section className="topic-detail-hero"><div className="topic-detail-hero-copy"><div className="topic-detail-meta"><Badge tone="blue">{topic.branch}</Badge><Badge>{topic.level}</Badge><span><Clock3 size={13} /> {topic.duration_minutes} min</span></div><h1>{topic.title}<span className="welcome-period">.</span></h1><p>{topic.summary}</p><div className="topic-detail-author"><span className="topic-author-mark"><BookOpen size={13} /></span><span>NEXORA STARTER CURRICULUM</span><span className="topic-author-separator">·</span><span>Reviewed learning content</span></div></div><div className="topic-hero-graphic"><div className="topic-hero-graphic-ring ring-one" /><div className="topic-hero-graphic-ring ring-two" /><div className="topic-hero-graphic-mark"><span>NX</span></div><div className="topic-hero-graphic-node node-one" /><div className="topic-hero-graphic-node node-two" /><div className="topic-hero-graphic-node node-three" /><span className="topic-hero-graphic-label">KNOWLEDGE / {String(topic.id).slice(0, 2).toUpperCase()}</span></div></section>
    <div className="topic-detail-layout"><div className="topic-content-column">
      <Card className="topic-objectives-card"><div className="topic-section-title"><span className="topic-section-icon"><ListChecks size={16} /></span><div><span className="card-eyebrow">LEARNING OBJECTIVES</span><h2>By the end, you can…</h2></div></div><ul>{objectives.map((objective) => <li key={objective}><span><CheckCircle2 size={14} /></span>{objective}</li>)}</ul></Card>
      <Card className="lesson-content-card"><div className="lesson-content-header"><span className="card-eyebrow"><BookOpen size={13} /> THE CONCEPT</span><span>~{topic.duration_minutes} MIN READ</span></div><div className="lesson-prose">{blocks.map((block, index) => block.startsWith('## ') ? <h2 key={index}>{block.slice(3)}</h2> : <p key={index}><InlineContent text={block} /></p>)}</div><div className="lesson-source-note"><Lightbulb size={14} /><span>This is a learning guide, not a substitute for official standards or supervised engineering review.</span></div></Card>
      {resources.rows.length > 0 && <Card className="topic-resources-card"><div className="topic-section-title"><span className="topic-section-icon topic-section-icon--blue"><ExternalLink size={15} /></span><div><span className="card-eyebrow">GO DEEPER</span><h2>Trusted references.</h2></div></div><div className="topic-resource-list">{resources.rows.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="topic-resource-item"><span><strong>{resource.title}</strong><small>{resource.kind} <span>·</span> {resource.description}</small></span><ArrowUpRight size={15} /></a>)}</div></Card>}
    </div><aside className="topic-sidebar-column"><Card className="topic-sidebar-card"><span className="card-eyebrow">YOUR PROGRESS</span><div className="topic-progress-state"><span className={`topic-status-icon${topic.status === 'completed' ? ' is-complete' : ''}`}>{topic.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}</span><div><strong>{topic.status === 'completed' ? 'Completed' : topic.status === 'in_progress' ? 'In progress' : 'Not started'}</strong><small>{topic.status === 'completed' ? 'Nicely done—review any time.' : topic.status === 'in_progress' ? 'Pick up where you left off.' : 'A focused first session.'}</small></div></div><div className="topic-sidebar-progress"><div><span>Concept progress</span><b>{topic.status === 'completed' ? 100 : topic.completion_percent || 0}%</b></div><div className="topic-sidebar-progress-bar"><i style={{ width: `${topic.status === 'completed' ? 100 : topic.completion_percent || 0}%` }} /></div></div><p className="topic-sidebar-next"><Sparkles size={12} /> Your progress is saved to your profile.</p></Card>
      <Card className="topic-sidebar-next-card"><div className="sidebar-next-icon"><Lightbulb size={15} /></div><span className="card-eyebrow">NEXT STEP</span><h3>Practice what you learned.</h3><p>Use a small question set to check understanding and adapt difficulty over time.</p><Link className="button button--secondary button--sm" href={`/practice?topic=${topic.slug}`}>Start practice <ArrowUpRight size={13} /></Link></Card>
      <div className="topic-safety-note"><span><CheckCircle2 size={13} /> CONTENT SOURCES</span><p>External references link to their original publishers. NEXORA does not claim to certify professional competency.</p></div>
    </aside></div>
    <TopicStudyActions topic={{ id: topic.id, slug: topic.slug, title: topic.title }} content={topic.content} isComplete={topic.status === 'completed'} aiConfigured={isAiConfigured()} />
  </div>;
}
