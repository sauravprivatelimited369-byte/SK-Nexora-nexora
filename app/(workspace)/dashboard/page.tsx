import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, BriefcaseBusiness, Check, ChevronRight,
  CircleHelp, Clock3, Code2, Flame, FolderKanban, Gauge, GitBranch, Lightbulb, Plus, Sparkles,
  Target, TrendingUp, Trophy, Zap,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getMonthlyUsage, getPlanForUser, isAiConfigured } from '@/lib/ai';
import { Badge, Card, ProgressBar, SectionHeading } from '@/components/ui';

export const metadata = { title: 'Dashboard' };

type TopicRow = { id: string; title: string; slug: string; summary: string; duration_minutes: number; status: string | null; completion_percent: number | null };
type ProjectRow = { id: string; title: string; description: string; status: string; progress: number; task_count: number; completed_task_count: number };
type SkillRow = { name: string; category: string; mastery: number; self_reported: boolean; evidence_count: number };

function greeting() {
  const hour = new Date().getUTCHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [nextTopicResult, progressResult, projectsResult, tasksResult, skillsResult, attemptsResult, plan, used] = await Promise.all([
    query<TopicRow>(
      `SELECT t.id,t.title,t.slug,t.summary,t.duration_minutes,up.status,up.completion_percent
       FROM learning_paths lp JOIN learning_path_items lpi ON lpi.path_id=lp.id
       LEFT JOIN topics t ON t.id=lpi.topic_id
       LEFT JOIN user_progress up ON up.topic_id=t.id AND up.user_id=lp.user_id
       WHERE lp.user_id=$1 AND (lpi.completed_at IS NULL OR up.status IS DISTINCT FROM 'completed')
       ORDER BY lp.created_at DESC,lpi.sort_order ASC LIMIT 1`, [user.id]),
    query<{ total: number; done: number }>(
      `SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE up.status='completed')::int AS done
       FROM learning_paths lp JOIN learning_path_items i ON i.path_id=lp.id
       LEFT JOIN user_progress up ON up.user_id=lp.user_id AND up.topic_id=i.topic_id WHERE lp.user_id=$1`, [user.id]),
    query<ProjectRow>(
      `SELECT p.id,p.title,p.description,p.status,p.progress,COUNT(t.id)::int AS task_count,
       COUNT(t.id) FILTER (WHERE t.completed=TRUE)::int AS completed_task_count
       FROM projects p LEFT JOIN project_tasks t ON t.project_id=p.id WHERE p.user_id=$1 AND p.status<>'archived'
       GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 3`, [user.id]),
    query<{ id: string; title: string; project_id: string; project_title: string }>(
      `SELECT t.id,t.title,t.project_id,p.title AS project_title FROM project_tasks t JOIN projects p ON p.id=t.project_id
       WHERE p.user_id=$1 AND t.completed=FALSE AND p.status<>'archived' ORDER BY p.updated_at DESC,t.sort_order ASC LIMIT 3`, [user.id]),
    query<SkillRow>(
      `SELECT s.name,s.category,us.mastery,us.self_reported,COUNT(e.id)::int AS evidence_count
       FROM user_skills us JOIN skills s ON s.id=us.skill_id LEFT JOIN skill_evidence e ON e.user_id=us.user_id AND e.skill_id=us.skill_id
       WHERE us.user_id=$1 GROUP BY s.id,s.name,s.category,us.mastery,us.self_reported ORDER BY us.mastery DESC LIMIT 4`, [user.id]),
    query<{ total: number; correct: number }>('SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE is_correct=TRUE)::int AS correct FROM attempts WHERE user_id=$1 AND created_at>NOW()-INTERVAL \'30 days\'', [user.id]),
    getPlanForUser(user.id), getMonthlyUsage(user.id),
  ]);
  const nextTopic = nextTopicResult.rows[0];
  const pathTotal = Number(progressResult.rows[0]?.total ?? 0);
  const pathDone = Number(progressResult.rows[0]?.done ?? 0);
  const pathProgress = pathTotal ? Math.round(pathDone / pathTotal * 100) : 0;
  const projects = projectsResult.rows;
  const tasks = tasksResult.rows;
  const skills = skillsResult.rows;
  const attempts = attemptsResult.rows[0];
  const accuracy = attempts?.total ? Math.round(Number(attempts.correct) / Number(attempts.total) * 100) : 0;
  const techCount = JSON.parse(user.technologies || '[]').length;
  const weakestSkill = skills.filter((skill) => !skill.self_reported).sort((a, b) => a.mastery - b.mastery)[0];

  return <div className="dashboard-page page-stack">
    <div className="dashboard-welcome-row"><div><div className="page-kicker"><span className="live-dot" /> YOUR ENGINEERING WORKSPACE <span className="page-kicker-divider">·</span> {user.branch?.toUpperCase()}</div><h1>{greeting()}, {user.name.split(' ')[0]}<span className="welcome-period">.</span></h1><p className="dashboard-intro">Every project is a chance to make what you know visible.</p></div><Link className="button button--primary" href="/projects/new"><Plus size={16} /> Start a project</Link></div>

    <div className="dashboard-goal-banner"><span className="goal-banner-icon"><Target size={17} /></span><div className="goal-banner-copy"><span>YOUR CURRENT DIRECTION</span><strong>{user.primary_goal === 'Get internship' ? 'Become internship-ready' : user.primary_goal === 'Get placement' ? 'Prepare for placement' : user.primary_goal || 'Build your engineering path'}</strong><small>{user.branch} <i>·</i> {user.current_year} <i>·</i> {user.weekly_hours} / week</small></div><div className="goal-banner-progress"><div><span>Learning path</span><strong>{pathProgress}%</strong></div><ProgressBar value={pathProgress} /><small>{pathDone} of {pathTotal} curated topics completed</small></div><Link className="goal-edit-link" href="/settings" aria-label="Edit engineering profile"><ArrowUpRight size={17} /></Link></div>

    <div className="dashboard-metrics-grid">
      <Card className="metric-card metric-card--progress"><div className="metric-card-top"><span>PATH PROGRESS</span><span className="metric-icon metric-icon--lime"><TrendingUp size={15} /></span></div><div className="metric-main"><strong>{pathProgress}<small>%</small></strong><span>{pathTotal ? `${pathDone} completed · ${pathTotal - pathDone} to go` : 'Roadmap is being shaped'}</span></div><ProgressBar value={pathProgress} color="lime" /><div className="metric-card-foot"><span><CircleHelp size={12} /> Based on completed roadmap topics</span><Link href="/learn">Open path <ArrowRight size={12} /></Link></div></Card>
      <Card className="metric-card"><div className="metric-card-top"><span>ACTIVE PROJECTS</span><span className="metric-icon metric-icon--blue"><FolderKanban size={15} /></span></div><div className="metric-main"><strong>{projects.length.toString().padStart(2, '0')}</strong><span>{projects.length === 1 ? 'project in progress' : 'projects in your workspace'}</span></div><div className="metric-mini-list">{projects.slice(0, 2).map((project) => <div key={project.id}><span className="metric-mini-dot" /><span>{project.title}</span><b>{project.progress}%</b></div>)}{!projects.length && <div className="metric-empty-link"><Link href="/projects/new">Turn an idea into a plan <ArrowRight size={12} /></Link></div>}</div></Card>
      <Card className="metric-card"><div className="metric-card-top"><span>PRACTICE ACCURACY</span><span className="metric-icon metric-icon--purple"><BrainCircuit size={15} /></span></div><div className="metric-main"><strong>{attempts?.total ? accuracy : '—'}{attempts?.total && <small>%</small>}</strong><span>{attempts?.total ? `${attempts.total} answers in 30 days` : 'Ready when you are'}</span></div><div className="metric-card-foot"><span><Flame size={12} /> Adaptive practice tracks weak spots</span><Link href="/practice">Practice <ArrowRight size={12} /></Link></div></Card>
      <Card className="metric-card"><div className="metric-card-top"><span>AI REQUESTS</span><span className="metric-icon metric-icon--orange"><Sparkles size={15} /></span></div><div className="metric-main"><strong>{used}<small>/{plan.ai_request_limit}</small></strong><span>{plan.name} · resets monthly</span></div><ProgressBar value={Math.min(100, used / Math.max(plan.ai_request_limit, 1) * 100)} color="blue" /><div className="metric-card-foot"><span>{isAiConfigured() ? 'Provider-connected features' : 'AI provider not connected'}</span><Link href="/pricing">Plan details <ArrowRight size={12} /></Link></div></Card>
    </div>

    <div className="dashboard-main-grid">
      <Card className="learning-card"><div className="card-heading-row"><div><span className="card-eyebrow"><BookOpen size={13} /> LEARNING PATH</span><h2>Pick up your learning.</h2><p>One focused concept, connected to your goal.</p></div><Link href="/learn" className="icon-arrow-button" aria-label="Browse all topics"><ArrowUpRight size={16} /></Link></div>
        {nextTopic ? <div className="current-topic-card"><div className="topic-art"><div className="topic-art-orbit orbit-a" /><div className="topic-art-orbit orbit-b" /><div className="topic-art-core"><Code2 size={20} /></div><span className="topic-art-tag">{user.branch === 'Computer Science' ? 'SYSTEMS / 01' : `${user.branch?.toUpperCase()} / 01`}</span></div><div className="current-topic-copy"><div className="topic-meta-row"><Badge tone="blue">{nextTopic.status === 'in_progress' ? 'IN PROGRESS' : 'NEXT IN PATH'}</Badge><span><Clock3 size={12} /> {nextTopic.duration_minutes} min</span></div><h3>{nextTopic.title}</h3><p>{nextTopic.summary}</p><Link className="button button--secondary button--sm" href={`/learn/${nextTopic.slug}`}>{nextTopic.status === 'in_progress' ? 'Continue learning' : 'Start topic'} <ArrowRight size={14} /></Link></div></div> : <div className="inline-empty"><span className="inline-empty-icon"><BookOpen size={18} /></span><div><strong>Your next concept is ready.</strong><p>Explore curated topics across your engineering branch.</p></div><Link href="/learn">Explore topics <ArrowRight size={13} /></Link></div>}
        <div className="learning-card-foot"><span><Sparkles size={12} /> Curated for {user.skill_level?.toLowerCase()} level</span><span>{user.weekly_hours} weekly commitment</span></div>
      </Card>

      <Card className="signal-card"><div className="signal-top"><span className="signal-icon"><Lightbulb size={16} /></span><span className="card-eyebrow">NEXORA SIGNAL</span><span className="signal-live"><i /> LIVE</span></div><h2>{weakestSkill ? `Strengthen ${weakestSkill.name}.` : 'Make your first move count.'}</h2><p>{weakestSkill ? `Your ${weakestSkill.category.toLowerCase()} practice is currently at a ${weakestSkill.mastery}% mastery estimate. A focused review and a few targeted questions can move it forward.` : techCount ? `You’ve identified ${techCount} technologies to explore. Complete a concept and practice set to build a learning signal.` : 'Choose a topic, build something small, and start connecting what you learn to what you can do.'}</p><div className="signal-recommendation"><span className="signal-step-number">NEXT</span><div><strong>{weakestSkill ? 'Review one concept, then practice 5 questions' : nextTopic ? `Start ${nextTopic.title}` : 'Pick a branch-specific topic'}</strong><small>{weakestSkill ? 'Practice mastery adjusts with each attempt' : 'A short focused session is a good start'}</small></div><Link href={weakestSkill ? '/practice' : nextTopic ? `/learn/${nextTopic.slug}` : '/learn'} aria-label="Follow recommendation"><ArrowRight size={15} /></Link></div><div className="signal-foot"><span><ShieldCheckIcon /> Evidence-based, not an AI-verified claim</span><span>Updated just now</span></div></Card>
    </div>

    <div className="dashboard-lower-grid">
      <Card className="task-card"><div className="card-heading-row compact"><div><span className="card-eyebrow"><Check size={13} /> YOUR NEXT ACTIONS</span><h2>Keep the momentum.</h2></div><Link className="subtle-link" href="/projects">All work <ArrowUpRight size={13} /></Link></div>
        {tasks.length ? <div className="today-task-list">{tasks.map((task, index) => <Link className="today-task" key={task.id} href={`/projects/${task.project_id}`}><span className={`task-index task-index--${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><span className="today-task-copy"><strong>{task.title}</strong><small>{task.project_title}</small></span><span className="task-state">OPEN <ChevronRight size={13} /></span></Link>)}</div> : <div className="inline-empty inline-empty--small"><span className="inline-empty-icon"><Check size={16} /></span><div><strong>No project tasks yet.</strong><p>Build a project to turn your learning into evidence.</p></div><Link href="/projects/new">Create one <ArrowRight size={13} /></Link></div>}
      </Card>
      <Card className="skills-card"><div className="card-heading-row compact"><div><span className="card-eyebrow"><Gauge size={13} /> SKILL SIGNAL</span><h2>Your capabilities, in context.</h2></div><Link className="subtle-link" href="/skills">View graph <ArrowUpRight size={13} /></Link></div>
        {skills.length ? <div className="skill-mini-list">{skills.slice(0, 3).map((skill, index) => <div className="skill-mini-row" key={skill.name}><span className={`skill-color-dot skill-color-dot--${index}`} /><div className="skill-mini-copy"><div><strong>{skill.name}</strong><span>{skill.self_reported ? 'Self-reported' : skill.evidence_count ? `${skill.evidence_count} evidence item${skill.evidence_count === 1 ? '' : 's'}` : 'Practice estimate'}</span></div><ProgressBar value={skill.mastery} color={index === 1 ? 'blue' : index === 2 ? 'purple' : 'lime'} /></div><b className="skill-mini-score">{skill.mastery}</b></div>)}</div> : <div className="inline-empty inline-empty--small"><span className="inline-empty-icon"><Trophy size={15} /></span><div><strong>Your graph will grow with your work.</strong><p>Practice and project artifacts create evidence.</p></div><Link href="/practice">Practice <ArrowRight size={13} /></Link></div>}
        <div className="skill-card-foot"><span><CircleHelp size={12} /> Estimated mastery, not verified credentials</span></div>
      </Card>
    </div>

    <Card className="dashboard-project-strip"><div className="project-strip-heading"><div><span className="card-eyebrow"><FolderKanban size={13} /> PROJECT WORKSPACE</span><h2>Build proof, not just plans.</h2><p>Your work becomes the evidence behind your next opportunity.</p></div><Link className="button button--secondary button--sm" href="/projects">View projects <ArrowRight size={14} /></Link></div><div className="project-strip-items">{projects.map((project) => <Link href={`/projects/${project.id}`} key={project.id} className="project-strip-item"><span className="project-strip-symbol"><GitBranch size={16} /></span><span className="project-strip-copy"><strong>{project.title}</strong><small>{project.completed_task_count} of {project.task_count} milestones complete</small></span><span className="project-strip-progress"><ProgressBar value={project.progress} /><b>{project.progress}%</b></span><ArrowUpRight size={14} className="project-strip-arrow" /></Link>)}{!projects.length && <div className="project-strip-empty"><span className="project-strip-empty-symbol"><BriefcaseBusiness size={17} /></span><div><strong>Your first project belongs here.</strong><small>Generate a plan, work through milestones, and save real implementation evidence.</small></div><Link href="/projects/new">Create a project <ArrowRight size={13} /></Link></div>}</div></Card>

    <div className="dashboard-bottom-note"><span><Sparkles size={13} /> Keep your next step small. Your evidence compounds.</span><span>AI {isAiConfigured() ? 'connected' : 'not configured'} · Private by default</span></div>
  </div>;
}

function ShieldCheckIcon() { return <Check size={12} />; }
