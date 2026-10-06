import { BookOpen, Compass, Search, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { LearningLibrary } from '@/components/learning-library';
import { SectionHeading } from '@/components/ui';

export const metadata = { title: 'Learn' };

type Topic = { id: string; title: string; slug: string; summary: string; level: string; duration_minutes: number; branch: string; subject: string; progress_status: string | null; completion_percent: number | null };
type Resource = { id: string; title: string; kind: string; url: string; description: string; difficulty: string; branch: string };

export default async function LearnPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [topics, resources] = await Promise.all([
    query<Topic>(
      `SELECT t.id,t.title,t.slug,t.summary,t.level,t.duration_minutes,s.branch,s.name AS subject,
        up.status AS progress_status,up.completion_percent
       FROM topics t JOIN subjects s ON s.id=t.subject_id
       LEFT JOIN user_progress up ON up.topic_id=t.id AND up.user_id=$1
       ORDER BY CASE WHEN s.branch=$2 THEN 0 ELSE 1 END,t.sort_order,t.title`,
      [user.id, user.branch === 'AI/ML' || user.branch === 'Data Science' ? 'AI/ML & Data Science' : user.branch],
    ),
    query<Resource>(
      `SELECT r.id,r.title,r.kind,r.url,r.description,r.difficulty,COALESCE(s.branch,'All disciplines') AS branch
       FROM resources r LEFT JOIN topics t ON t.id=r.topic_id LEFT JOIN subjects s ON s.id=t.subject_id ORDER BY r.title`,
    ),
  ]);
  const completed = topics.rows.filter((topic) => topic.progress_status === 'completed').length;
  return <div className="page-stack learning-library-page">
    <div className="page-hero-row"><div><div className="page-kicker"><BookOpen size={13} /> KNOWLEDGE SYSTEM <span className="page-kicker-divider">·</span> {user.branch?.toUpperCase()}</div><h1>Learn with direction<span className="welcome-period">.</span></h1><p className="dashboard-intro">Curated, structured concepts across engineering—not a feed to get lost in.</p></div><div className="learning-stat-pill"><span><Compass size={14} /></span><div><strong>{completed}/{topics.rows.length}</strong><small>topics completed</small></div></div></div>
    <div className="learning-intent-banner"><span className="learning-intent-icon"><Sparkles size={15} /></span><div><strong>Your path starts from {user.skill_level?.toLowerCase()} level.</strong><p>Topics from {user.branch} are prioritized. Explore any discipline whenever you’re curious.</p></div><span className="learning-intent-tag">{user.weekly_hours} / WEEK</span></div>
    <LearningLibrary topics={topics.rows} resources={resources.rows} selectedBranch={user.branch || ''} />
  </div>;
}
