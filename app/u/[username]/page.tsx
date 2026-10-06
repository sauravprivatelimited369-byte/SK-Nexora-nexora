import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, Check, ExternalLink, FileText, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { query } from '@/lib/db';
import { Brand } from '@/components/brand';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

type PublicProfile = { username: string; headline: string; about: string; show_email: boolean; show_resume: boolean; is_public: boolean; name: string; email: string; branch: string | null; current_year: string | null };
type Project = { id: string; title: string; description: string; status: string; evidence_names: string; skill_names: string; evidence_count: number };
type Skill = { name: string; category: string; source_types: string; count: number };
type ResumeContent = { headline?: string; summary?: string; education?: { role: string; organization: string; dates: string; details: string }[]; experience?: { role: string; organization: string; dates: string; details: string }[]; certifications?: { name: string; issuer: string; date: string }[]; links?: { github?: string; linkedin?: string; website?: string } };

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await query<{ name: string; headline: string; is_public: boolean }>(
    'SELECT u.name,pt.headline,pt.is_public FROM portfolios pt JOIN users u ON u.id=pt.user_id WHERE pt.username=$1', [username.toLowerCase()],
  );
  if (!profile.rows[0]?.is_public) return { title: 'Portfolio unavailable', robots: { index: false, follow: false } };
  const { name, headline } = profile.rows[0];
  return { title: `${name} — Engineering Portfolio`, description: headline || `Engineering portfolio for ${name}.`, openGraph: { title: `${name} — Engineering Portfolio`, description: headline || 'Project-based engineering work and learning.' }, robots: { index: true, follow: true } };
}

export default async function PublicPortfolioPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileResult = await query<PublicProfile>(
    `SELECT pt.username,pt.headline,pt.about,pt.show_email,pt.show_resume,pt.is_public,u.name,u.email,p.branch,p.current_year
     FROM portfolios pt JOIN users u ON u.id=pt.user_id JOIN profiles p ON p.user_id=u.id
     WHERE pt.username=$1 AND pt.is_public=TRUE AND p.portfolio_public=TRUE`, [username.toLowerCase()],
  );
  const profile = profileResult.rows[0];
  if (!profile) notFound();
  const [projects, skills, resumeResult] = await Promise.all([
    query<Project>(
      `SELECT p.id,p.title,p.description,p.status,COUNT(DISTINCT f.id)::int AS evidence_count,
        COALESCE(STRING_AGG(DISTINCT f.filename, ', '),'') AS evidence_names,
        COALESCE(STRING_AGG(DISTINCT s.name, ', '),'') AS skill_names
       FROM projects p LEFT JOIN project_files f ON f.project_id=p.id AND f.user_id=p.user_id
       LEFT JOIN skill_evidence e ON e.project_id=p.id AND e.user_id=p.user_id
       LEFT JOIN skills s ON s.id=e.skill_id
       WHERE p.user_id=(SELECT user_id FROM portfolios WHERE username=$1) AND p.visibility='public'
       GROUP BY p.id ORDER BY p.updated_at DESC`, [profile.username]),
    query<Skill>(
      `SELECT s.name,s.category,STRING_AGG(DISTINCT e.source_type, ',') AS source_types,COUNT(DISTINCT e.id)::int AS count
       FROM user_skills us JOIN skills s ON s.id=us.skill_id JOIN skill_evidence e ON e.user_id=us.user_id AND e.skill_id=us.skill_id
       WHERE us.user_id=(SELECT user_id FROM portfolios WHERE username=$1) AND us.self_reported=FALSE
       GROUP BY s.id,s.name,s.category ORDER BY s.name`, [profile.username]),
    profile.show_resume ? query<{ content: string }>('SELECT content FROM resumes WHERE user_id=(SELECT user_id FROM portfolios WHERE username=$1) ORDER BY updated_at DESC LIMIT 1', [profile.username]) : Promise.resolve({ rows: [], rowCount: 0 }),
  ]);
  let resume: ResumeContent | null = null;
  try { if (resumeResult.rows[0]) resume = JSON.parse(resumeResult.rows[0].content) as ResumeContent; } catch { resume = null; }
  const externalLinks = resume?.links || {};
  return <main className="public-portfolio-page"><header className="public-portfolio-header"><Link href="/" aria-label="NEXORA home"><Brand /></Link><span className="public-view-label"><span className="public-live-dot" /> PUBLIC PORTFOLIO</span><a className="public-header-cta" href="mailto:hello@nexora.app">About NEXORA <ArrowUpRight size={13} /></a></header><div className="public-profile-cover"><div className="public-cover-grid" /><div className="public-cover-orb cover-orb-one" /><div className="public-cover-orb cover-orb-two" /><span className="public-cover-code">NEXORA / ENGINEERING WORKSPACE</span></div><div className="public-portfolio-content"><section className="public-profile-intro"><div className="public-profile-avatar">{profile.name.slice(0, 1).toUpperCase()}</div><div className="public-profile-primary"><div className="public-profile-title-row"><div><h1>{profile.name}</h1><p>{profile.headline || `${profile.branch || 'Engineering'} learner`}</p></div><Badge tone="lime"><Check size={11} /> PUBLIC PROFILE</Badge></div><div className="public-profile-meta"><span>{profile.branch || 'Engineering'}</span>{profile.current_year && <><i /> <span>{profile.current_year}</span></>}<i /><span>Member since NEXORA</span></div>{profile.about && <p className="public-profile-about">{profile.about}</p>}{profile.show_email && <a href={`mailto:${profile.email}`} className="public-contact-button"><Mail size={14} /> Contact</a>}</div><div className="public-profile-socials">{externalLinks.github && <a href={externalLinks.github} target="_blank" rel="noreferrer" aria-label="GitHub profile"><ExternalLink size={14} /> GitHub</a>}{externalLinks.linkedin && <a href={externalLinks.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn profile"><ExternalLink size={14} /> LinkedIn</a>}{externalLinks.website && <a href={externalLinks.website} target="_blank" rel="noreferrer" aria-label="Personal website"><ArrowUpRight size={14} /> Website</a>}</div></section>
    {skills.rows.length > 0 && <section className="public-section"><div className="public-section-head"><div><span className="card-eyebrow"><Sparkles size={13} /> SKILL EVIDENCE</span><h2>Capabilities in context.</h2><p>Each skill is linked to practice or a user-provided project artifact. None are independently verified.</p></div><span className="public-section-count">{skills.rows.length.toString().padStart(2, '0')} skills</span></div><div className="public-skill-grid">{skills.rows.map((skill) => <div className="public-skill-card" key={skill.name}><span className="public-skill-check"><Check size={12} /></span><div><strong>{skill.name}</strong><small>{skill.count} evidence signal{skill.count === 1 ? '' : 's'} · {skill.source_types?.replaceAll(',', ' + ')}</small></div><span className="public-skill-category">{skill.category}</span></div>)}</div></section>}
    <section className="public-section public-project-section"><div className="public-section-head"><div><span className="card-eyebrow"><BriefcaseBusiness size={13} /> PROJECTS</span><h2>Work in progress, made visible.</h2><p>Projects are labeled by their saved artifacts and learner-marked status—not platform certification.</p></div><span className="public-section-count">{projects.rows.length.toString().padStart(2, '0')} projects</span></div>{projects.rows.length ? <div className="public-project-grid">{projects.rows.map((project, index) => <article className={`public-project-card public-project-card--${index % 3}`} key={project.id}><div className="public-project-top"><span className="public-project-index">PROJECT / {String(index + 1).padStart(2, '0')}</span><span className={`public-project-status${project.status === 'completed' ? ' is-complete' : ''}`}><i />{project.status.replace('_', ' ')}</span></div><h3>{project.title}</h3><span className="public-project-brief-label">PROJECT PLAN</span><p>{project.description}</p>{project.evidence_count ? <div className="public-artifact-list"><span><FileText size={12} /> SHARED ARTIFACTS</span><small>{project.evidence_names}</small></div> : <div className="public-no-artifacts"><ShieldCheck size={13} /> Plan shared · no artifact selected</div>}{project.skill_names && <div className="public-project-skills">{project.skill_names.split(', ').slice(0, 4).map((skill) => <i key={skill}>{skill}</i>)}</div>}<span className="public-project-foot"><BadgeCheck size={12} /> {project.status === 'completed' ? 'Milestones marked complete by the learner' : 'Learner-managed project status'}</span></article>)}</div> : <div className="public-no-projects"><BriefcaseBusiness size={17} /><span>No projects have been selected for public sharing.</span></div>}</section>
    {resume && profile.show_resume && <section className="public-section public-resume-section"><div className="public-section-head"><div><span className="card-eyebrow"><FileText size={13} /> RESUME SUMMARY</span><h2>Career details, shared by choice.</h2><p>Resume fields are user-provided. Empty sections are omitted.</p></div><ShieldCheck size={17} className="public-resume-shield" /></div>{resume.summary && <p className="public-resume-summary">{resume.summary}</p>}{resume.education?.filter((item) => item.role || item.organization).map((item, index) => <div className="public-resume-row" key={`edu-${index}`}><strong>{item.role}</strong><span>{item.organization}</span><small>{item.dates}</small></div>)}{resume.experience?.filter((item) => item.role || item.organization).map((item, index) => <div className="public-resume-row" key={`exp-${index}`}><strong>{item.role}</strong><span>{item.organization}</span><small>{item.dates}</small></div>)}{resume.certifications?.filter((item) => item.name).map((item, index) => <div className="public-resume-row" key={`cert-${index}`}><strong>{item.name}</strong><span>{item.issuer}</span><small>{item.date}</small></div>)}</section>}
    <section className="public-portfolio-footer"><div><span className="public-footer-brand"><Brand compact /></span><span>Project-based engineering growth.</span></div><p>Public profile controlled by {profile.name}. Only selected information is shown.</p><Link href="/register">Build your NEXORA workspace <ArrowUpRight size={13} /></Link></section></div></main>;
}
