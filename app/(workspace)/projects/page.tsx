import Link from 'next/link';
import { ArrowRight, ArrowUpRight, FolderKanban, Plus, Workflow } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { Badge, Card, EmptyState, ProgressBar } from '@/components/ui';

export const metadata = { title: 'Projects' };

type Project = { id: string; title: string; prompt: string; description: string; status: string; difficulty: string; progress: number; created_at: string; task_count: number; completed_task_count: number; evidence_count: number };

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const projects = await query<Project>(
    `SELECT p.id,p.title,p.prompt,p.description,p.status,p.difficulty,p.progress,p.created_at,
     COUNT(DISTINCT t.id)::int AS task_count,COUNT(DISTINCT t.id) FILTER (WHERE t.completed=TRUE)::int AS completed_task_count,
     COUNT(DISTINCT f.id)::int AS evidence_count
     FROM projects p LEFT JOIN project_tasks t ON t.project_id=p.id LEFT JOIN project_files f ON f.project_id=p.id
     WHERE p.user_id=$1 AND p.status<>'archived' GROUP BY p.id ORDER BY p.updated_at DESC`, [user.id]);
  const active = projects.rows.filter((project) => project.status !== 'completed');
  const completed = projects.rows.filter((project) => project.status === 'completed');
  return <div className="page-stack projects-page"><div className="page-hero-row"><div><div className="page-kicker"><FolderKanban size={13} /> BUILD WORKSPACE <span className="page-kicker-divider">·</span> REAL-WORLD WORK</div><h1>Make your ideas<br className="mobile-break" /> buildable<span className="welcome-period">.</span></h1><p className="dashboard-intro">Scope a real problem, map the system, then leave a trail of work you can stand behind.</p></div><Link className="button button--primary" href="/projects/new"><Plus size={16} /> Create a project</Link></div>
    <div className="project-workflow-ribbon"><span><i>01</i> Describe the problem</span><ArrowRight size={13} /><span><i>02</i> Plan the system</span><ArrowRight size={13} /><span><i>03</i> Build and document</span><ArrowRight size={13} /><span><i>04</i> Show your evidence</span></div>
    {projects.rows.length ? <><div className="projects-overview-row"><div><span>ACTIVE WORK</span><strong>{active.length.toString().padStart(2, '0')}</strong></div><div><span>COMPLETED</span><strong>{completed.length.toString().padStart(2, '0')}</strong></div><div><span>ARTIFACTS ADDED</span><strong>{projects.rows.reduce((sum, project) => sum + project.evidence_count, 0).toString().padStart(2, '0')}</strong></div><div className="overview-note"><Workflow size={14} /> Planning is not proof. Add artifacts to create skill evidence.</div></div><div className="project-list-grid">{projects.rows.map((project, index) => <Link href={`/projects/${project.id}`} className="project-list-card-link" key={project.id}><Card className={`project-list-card project-list-card--${index % 3}`}><div className="project-list-card-top"><span className="project-list-icon"><Workflow size={16} /></span><Badge tone={project.status === 'completed' ? 'lime' : project.status === 'in_progress' ? 'blue' : 'neutral'}>{project.status.replace('_', ' ').toUpperCase()}</Badge><ArrowUpRight size={15} className="project-list-arrow" /></div><span className="project-list-difficulty">{project.difficulty.toUpperCase()} <i>·</i> {project.task_count} MILESTONES</span><h2>{project.title}</h2><p>{project.description}</p><div className="project-list-progress"><div><span>Workspace progress</span><b>{project.progress}%</b></div><ProgressBar value={project.progress} color={project.progress > 70 ? 'lime' : 'blue'} /></div><div className="project-list-card-foot"><span>{project.completed_task_count}/{project.task_count} tasks completed</span><span>{project.evidence_count} artifacts</span></div></Card></Link>)}</div></> : <Card className="projects-empty-card"><EmptyState icon={<FolderKanban size={21} />} title="Your project workspace is waiting." description="Start with a problem you care about. NEXORA will turn it into a scope, system design, milestones, and a way to collect evidence as you build." action={<Link className="button button--primary" href="/projects/new"><Plus size={15} /> Build your first project <ArrowRight size={14} /></Link>} /><div className="project-empty-example"><span>TRY THIS BRIEF</span><p>“I want to build an AI-powered smart agriculture monitoring system.”</p><span className="example-capsules"><i>Architecture</i><i>Budget assumptions</i><i>Build plan</i></span></div></Card>}
  </div>;
}
