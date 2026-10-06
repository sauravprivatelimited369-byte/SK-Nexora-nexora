import { FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { ResumeBuilder } from '@/components/resume-builder';

export const metadata = { title: 'Resume builder' };

type ResumeContent = { headline: string; summary: string; education: { role: string; organization: string; dates: string; details: string }[]; experience: { role: string; organization: string; dates: string; details: string }[]; certifications: { name: string; issuer: string; date: string }[]; links: { github: string; linkedin: string; website: string }; template: 'ats' | 'modern' };

export default async function ResumePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [resume, projects, skills] = await Promise.all([
    query<{ content: string; template: string }>('SELECT content,template FROM resumes WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1', [user.id]),
    query<{ id: string; title: string; description: string; status: string; evidence_count: number; evidence_names: string }>(
      `SELECT p.id,p.title,p.description,p.status,COUNT(f.id)::int AS evidence_count,
        COALESCE(STRING_AGG(f.filename, ', '), '') AS evidence_names
       FROM projects p LEFT JOIN project_files f ON f.project_id=p.id AND f.user_id=p.user_id
       WHERE p.user_id=$1 AND EXISTS (SELECT 1 FROM project_files pf WHERE pf.project_id=p.id AND pf.user_id=$1)
       GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 8`, [user.id]),
    query<{ name: string; category: string; mastery: number; self_reported: boolean; evidence_count: number }>(
      `SELECT s.name,s.category,us.mastery,us.self_reported,COUNT(e.id)::int AS evidence_count
       FROM user_skills us JOIN skills s ON s.id=us.skill_id LEFT JOIN skill_evidence e ON e.user_id=us.user_id AND e.skill_id=us.skill_id
       WHERE us.user_id=$1 GROUP BY s.id,s.name,s.category,us.mastery,us.self_reported
       HAVING COUNT(e.id)>0 AND us.self_reported=FALSE ORDER BY us.mastery DESC LIMIT 15`, [user.id]),
  ]);
  let content: ResumeContent | null = null;
  try { content = resume.rows[0] ? JSON.parse(resume.rows[0].content) as ResumeContent : null; } catch { content = null; }
  return <div className="page-stack resume-page"><div className="page-hero-row"><div><div className="page-kicker"><FileText size={13} /> RESUME BUILDER <span className="page-kicker-divider">·</span> FACTUAL BY DESIGN</div><h1>Make your work<br />read clearly<span className="welcome-period">.</span></h1><p className="dashboard-intro">Build an ATS-friendly resume from your actual profile and project evidence. Missing sections stay visibly yours to complete.</p></div><div className="resume-trust-note"><ShieldCheck size={14} /> No fabricated experience or credentials</div></div><div className="resume-privacy-banner"><span><Sparkles size={14} /></span><p><strong>Your resume is private.</strong> Only you can see it unless you download it or include it in a public portfolio. Project skills are included only when they have practice or artifact evidence.</p></div><ResumeBuilder user={{ name: user.name, email: user.email, branch: user.branch, currentYear: user.current_year, primaryGoal: user.primary_goal }} initialContent={content} projects={projects.rows} skills={skills.rows} /></div>;
}
