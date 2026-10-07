import { Sparkles, Terminal } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAiConfigured } from '@/lib/ai';
import { AiEngineerPanel } from '@/components/ai-engineer-panel';

export const metadata = { title: 'AI Engineer' };

export default async function AiEngineerPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  let projectId: string | undefined;
  let projectName: string | undefined;
  if (params.project) {
    const result = await query<{ id: string; title: string }>('SELECT id,title FROM projects WHERE id=$1 AND user_id=$2', [params.project, user.id]);
    projectId = result.rows[0]?.id;
    projectName = result.rows[0]?.title;
  }
  return <div className="page-stack ai-engineer-page"><div className="page-hero-row"><div><div className="page-kicker"><Sparkles size={13} /> AI ENGINEER <span className="page-kicker-divider">·</span> WORK THROUGH THE HARD PART</div><h1>Think like an engineer<span className="welcome-period">.</span></h1><p className="dashboard-intro">Debug a failure, stress-test a design, or learn a concept. Get an explanation, a fix path, and a way to verify it.</p></div><div className="ai-page-shortcut"><Terminal size={15} /><span>Open anywhere</span><kbd>⌘ K</kbd></div></div>{projectName && <div className="ai-project-context-banner"><span><Sparkles size={14} /></span><p>Project context attached: <strong>{projectName}</strong>. Only your plan and files you saved in that workspace are included.</p></div>}<AiEngineerPanel aiConfigured={isAiConfigured()} projectId={projectId} /><div className="ai-principles-row"><div><span>01</span><strong>Explain the why</strong><small>Every fix comes with reasoning.</small></div><div><span>02</span><strong>Show assumptions</strong><small>Uncertainty stays visible.</small></div><div><span>03</span><strong>Suggest a test</strong><small>Verify before you rely on it.</small></div></div></div>;
}
