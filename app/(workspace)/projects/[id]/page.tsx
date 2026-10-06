import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Check, CircleHelp, FolderKanban, GitBranch, Sparkles, Workflow } from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { ProjectWorkspace } from '@/components/project-workspace';
import { Badge, ProgressBar } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return { title: 'Project workspace' };
  const { id } = await params;
  const project = await query<{ title: string }>('SELECT title FROM projects WHERE id=$1 AND user_id=$2', [id, user.id]);
  return { title: project.rows[0]?.title || 'Project workspace' };
}

type Project = { id: string; title: string; prompt: string; description: string; status: string; difficulty: string; progress: number; generated_json: string; analysis_json: string | null; github_url: string | null; live_url: string | null; created_at: string; ai_generated: boolean };
type Task = { id: string; title: string; description: string; phase: string; sort_order: number; completed: boolean };
type File = { id: string; filename: string; content: string; created_at: string };

export default async function ProjectWorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  const [projectResult, tasksResult, filesResult] = await Promise.all([
    query<Project>('SELECT id,title,prompt,description,status,difficulty,progress,generated_json,analysis_json,github_url,live_url,created_at,ai_generated FROM projects WHERE id=$1 AND user_id=$2', [id, user.id]),
    query<Task>('SELECT id,title,description,phase,sort_order,completed FROM project_tasks WHERE project_id=$1 ORDER BY sort_order', [id]),
    query<File>('SELECT id,filename,content,created_at FROM project_files WHERE project_id=$1 AND user_id=$2 ORDER BY created_at DESC', [id, user.id]),
  ]);
  const project = projectResult.rows[0];
  if (!project) notFound();
  let blueprint: Record<string, unknown>;
  let analysis: Record<string, unknown> | null = null;
  try { blueprint = JSON.parse(project.generated_json); } catch { blueprint = {}; }
  try { analysis = project.analysis_json ? JSON.parse(project.analysis_json) as Record<string, unknown> : null; } catch { analysis = null; }
  const queryParams = await searchParams;
  return <div className="page-stack project-workspace-page"><div className="project-workspace-breadcrumb"><Link href="/projects"><ArrowLeft size={13} /> Projects</Link><span>/</span><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{project.title}</strong><span className="workspace-status-badge"><i className={project.status === 'completed' ? 'is-complete' : ''} /> {project.status.replace('_', ' ')}</span></div>
    {queryParams.created === 'starter' && <div className="workspace-source-notice"><CircleHelp size={14} /><span><strong>Starter blueprint saved.</strong> This plan came from NEXORA’s structured project framework, not an AI provider. Add <code>AI_API_KEY</code> for tailored generation. You can still edit, build, and document it here.</span></div>}
    {queryParams.created === 'ai' && <div className="workspace-source-notice workspace-source-notice--ai"><Sparkles size={14} /><span><strong>AI-generated plan.</strong> Review assumptions, especially budget, safety, and deployment details, before acting on them.</span></div>}
    <div className="project-workspace-head"><div><div className="project-detail-tags"><Badge tone="blue"><FolderKanban size={11} /> {project.difficulty}</Badge><Badge tone={project.status === 'completed' ? 'lime' : 'neutral'}>{project.status.replace('_', ' ')}</Badge><span>CREATED {new Date(project.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}</span></div><h1>{project.title}</h1><p>{project.description}</p></div><div className="project-head-progress"><span><Workflow size={13} /> WORKSPACE PROGRESS</span><strong>{project.progress}<small>%</small></strong><ProgressBar value={project.progress} /></div></div>
    <div className="project-info-strip"><div><span className="info-strip-icon"><GitBranch size={14} /></span><span><small>PROJECT INTENT</small><b>{project.prompt.slice(0, 86)}{project.prompt.length > 86 ? '…' : ''}</b></span></div><div><span className="info-strip-icon info-strip-icon--purple"><Sparkles size={14} /></span><span><small>PLAN SOURCE</small><b>{project.ai_generated ? 'AI-generated, review assumptions' : 'NEXORA starter framework'}</b></span></div><div><span className="info-strip-icon info-strip-icon--blue"><Check size={14} /></span><span><small>ARTIFACTS</small><b>{filesResult.rows.length} saved {filesResult.rows.length === 1 ? 'file' : 'files'}</b></span></div><Link href={`/ai-engineer?project=${project.id}`} className="project-copilot-cta"><Sparkles size={14} /> Ask AI Engineer <ArrowUpRight size={13} /></Link></div>
    <ProjectWorkspace project={project} blueprint={blueprint} initialTasks={tasksResult.rows} initialFiles={filesResult.rows} initialAnalysis={analysis} aiConfigured={Boolean(process.env.AI_API_KEY?.trim())} />
  </div>;
}
