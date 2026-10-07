import { ArrowUpRight, BriefcaseBusiness, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { PortfolioBuilder } from '@/components/portfolio-builder';

export const metadata = { title: 'Portfolio builder' };

type Portfolio = { username: string; headline: string; about: string; is_public: boolean; show_email: boolean; show_resume: boolean };
type Project = { id: string; title: string; description: string; status: string; visibility: string; evidence_count: number; evidence_names: string; skill_names: string };
type Skill = { name: string; mastery: number; evidence_count: number; self_reported: boolean };

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [portfolio, projects, skills, resume] = await Promise.all([
    query<Portfolio>(`SELECT p.username,p.headline,p.about,p.is_public,p.show_email,p.show_resume FROM portfolios p WHERE p.user_id=$1`, [user.id]),
    query<Project>(
      `SELECT p.id,p.title,p.description,p.status,p.visibility,COUNT(DISTINCT f.id)::int AS evidence_count,
       COALESCE(STRING_AGG(DISTINCT f.filename, ', '),'') AS evidence_names,
       COALESCE(STRING_AGG(DISTINCT s.name, ', '),'') AS skill_names
       FROM projects p LEFT JOIN project_files f ON f.project_id=p.id AND f.user_id=p.user_id
       LEFT JOIN skill_evidence e ON e.project_id=p.id AND e.user_id=p.user_id
       LEFT JOIN skills s ON s.id=e.skill_id
       WHERE p.user_id=$1 AND p.status<>'archived' GROUP BY p.id ORDER BY p.updated_at DESC`, [user.id]),
    query<Skill>(`SELECT s.name,us.mastery,us.self_reported,COUNT(e.id)::int AS evidence_count FROM user_skills us JOIN skills s ON s.id=us.skill_id LEFT JOIN skill_evidence e ON e.user_id=us.user_id AND e.skill_id=us.skill_id WHERE us.user_id=$1 GROUP BY s.id,s.name,us.mastery,us.self_reported ORDER BY us.mastery DESC`, [user.id]),
    query('SELECT id FROM resumes WHERE user_id=$1 LIMIT 1', [user.id]),
  ]);
  const profile = portfolio.rows[0] || { username: user.username || `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.id.slice(0, 4)}`, headline: '', about: '', is_public: false, show_email: false, show_resume: false };
  return <div className="page-stack portfolio-page"><div className="page-hero-row"><div><div className="page-kicker"><BriefcaseBusiness size={13} /> PORTFOLIO BUILDER <span className="page-kicker-divider">·</span> YOUR WORK, YOUR CALL</div><h1>Show work you<br />can stand behind<span className="welcome-period">.</span></h1><p className="dashboard-intro">Build a public home for your projects and skills. Every field is sourced from you or your NEXORA workspace.</p></div><div className={`portfolio-public-state${profile.is_public ? ' is-public' : ''}`}><span className="portfolio-public-dot" /><span>{profile.is_public ? 'PUBLIC' : 'PRIVATE'} PORTFOLIO</span></div></div><div className="portfolio-privacy-banner"><ShieldCheck size={14} /><span>Private by default. Your email, resume, and projects appear publicly only when you explicitly select them and publish.</span></div><PortfolioBuilder profile={profile} user={{ name: user.name, email: user.email, branch: user.branch, currentYear: user.current_year }} projects={projects.rows} skills={skills.rows} hasResume={!!resume.rowCount} /></div>;
}
