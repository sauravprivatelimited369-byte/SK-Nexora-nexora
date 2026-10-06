'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Code2, Cpu, Database, DraftingCompass, GraduationCap, Layers, Rocket, Sparkles, Terminal, Timer, Zap } from 'lucide-react';
import { Brand } from './brand';

const steps = ['About you', 'Your branch', 'Study stage', 'Starting point', 'Your goal', 'Toolbox', 'Your time'];
const branches = ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil', 'Chemical', 'AI/ML', 'Data Science', 'Other'];
const goals = ['Learn', 'Build projects', 'Get internship', 'Get placement', 'Improve coding', 'Prepare for interviews', 'Build startup', 'Research'];
const technologies = ['Python', 'JavaScript', 'TypeScript', 'C / C++', 'Java', 'SQL', 'React', 'Arduino / ESP32', 'CAD', 'MATLAB', 'Git', 'Data analysis'];
const goalDescriptions: Record<string, string> = {
  'Learn': 'Build a confident foundation across your discipline.', 'Build projects': 'Turn ideas into real, well-documented work.', 'Get internship': 'Develop practical evidence for your first opportunity.',
  'Get placement': 'Focus on the skills and signals employers look for.', 'Improve coding': 'Practice problem-solving and stronger implementation habits.',
  'Prepare for interviews': 'Sharpen technical fundamentals and communication.', 'Build startup': 'Validate a problem and prototype a useful solution.', 'Research': 'Develop the methods and tools to explore a question.',
};

export function OnboardingForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: initialName, branch: '', currentYear: '', skillLevel: '', primaryGoal: '', technologies: [] as string[], weeklyHours: '' });
  const [customTech, setCustomTech] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function canContinue() {
    if (step === 0) return form.name.trim().length >= 2;
    if (step === 1) return !!form.branch;
    if (step === 2) return !!form.currentYear;
    if (step === 3) return !!form.skillLevel;
    if (step === 4) return !!form.primaryGoal;
    if (step === 5) return form.technologies.length > 0;
    return !!form.weeklyHours;
  }
  function toggleTechnology(technology: string) {
    setForm((current) => ({ ...current, technologies: current.technologies.includes(technology) ? current.technologies.filter((item) => item !== technology) : current.technologies.length < 12 ? [...current.technologies, technology] : current.technologies }));
  }
  function addCustom(event: FormEvent) {
    event.preventDefault(); const value = customTech.trim();
    if (!value || form.technologies.length >= 12) return;
    if (!form.technologies.some((item) => item.toLowerCase() === value.toLowerCase())) toggleTechnology(value);
    setCustomTech('');
  }
  async function finish() {
    setError(''); setBusy(true);
    try {
      const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save your profile.');
      router.push('/dashboard'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  function next() { if (!canContinue()) return; if (step === steps.length - 1) { void finish(); return; } setStep((current) => current + 1); }

  return <main className="onboarding-layout"><header className="onboarding-header"><Link href="/" aria-label="NEXORA home"><Brand /></Link><div className="onboarding-save"><span className="save-dot" /> Your profile is private</div><button className="onboarding-exit" onClick={() => router.push('/dashboard')}>Exit setup <ArrowRight size={13} /></button></header><div className="onboarding-progress-wrap"><div className="onboarding-progress"><span style={{ width: `${(step / steps.length) * 100}%` }} /></div><div className="onboarding-progress-meta"><span>PROFILE SETUP</span><span>STEP {String(step + 1).padStart(2, '0')} <i>/ {String(steps.length).padStart(2, '0')}</i></span></div></div>
    <div className="onboarding-body"><div className="onboarding-step-nav">{steps.map((title, index) => <button key={title} className={`onboarding-step-dot${index === step ? ' is-current' : ''}${index < step ? ' is-done' : ''}`} onClick={() => index < step && setStep(index)} disabled={index > step} aria-label={`Step ${index + 1}: ${title}`}>{index < step ? <Check size={12} /> : <span>{String(index + 1).padStart(2, '0')}</span>}{index === step && <small>{title}</small>}</button>)}</div>
      <div className="onboarding-card"><div className="onboarding-card-top"><span className="onboarding-icon">{[<Sparkles key="s" />, <Layers key="b" />, <GraduationCap key="y" />, <CompassIcon key="l" />, <Rocket key="g" />, <Code2 key="t" />, <Timer key="w" />][step]}</span><span className="onboarding-step-label">{steps[step]} <span>· {step + 1} of {steps.length}</span></span></div>
        {step === 0 && <div className="onboarding-question"><h1>What should we<br />call you?</h1><p>Your name helps us make the workspace feel like yours.</p><label className="onboarding-field-label" htmlFor="profile-name">YOUR NAME</label><input id="profile-name" className="input onboarding-text-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" maxLength={80} /></div>}
        {step === 1 && <div className="onboarding-question"><h1>What kind of<br />engineering?</h1><p>We’ll use this to surface a relevant starting library. You can explore other branches anytime.</p><div className="onboarding-option-grid onboarding-branch-grid">{branches.map((branch) => <button key={branch} className={`onboarding-choice${form.branch === branch ? ' is-selected' : ''}`} onClick={() => setForm({ ...form, branch })}><span className="choice-icon">{branch === 'Electronics' ? <Cpu size={16} /> : branch === 'Mechanical' ? <DraftingCompass size={16} /> : branch === 'Electrical' ? <Zap size={16} /> : branch === 'AI/ML' || branch === 'Data Science' ? <Sparkles size={16} /> : branch === 'Computer Science' || branch === 'Information Technology' ? <Terminal size={16} /> : <Layers size={16} />}</span><span>{branch}</span>{form.branch === branch && <Check size={14} className="choice-check" />}</button>)}</div></div>}
        {step === 2 && <div className="onboarding-question"><h1>Where are you<br />in the journey?</h1><p>This gives us the right context—not a label. Your path can change as you grow.</p><div className="onboarding-option-stack">{['1st year', '2nd year', '3rd year', '4th year', 'Graduate', 'Early Career'].map((year) => <button key={year} className={`onboarding-choice onboarding-choice--wide${form.currentYear === year ? ' is-selected' : ''}`} onClick={() => setForm({ ...form, currentYear: year })}><span className="year-dot">{year === 'Graduate' || year === 'Early Career' ? '↗' : year.slice(0, 1)}</span><span>{year}</span>{form.currentYear === year && <Check size={14} className="choice-check" />}</button>)}</div></div>}
        {step === 3 && <div className="onboarding-question"><h1>Where are you<br />starting from?</h1><p>This helps us calibrate explanations and practice. It’s a starting estimate, not a judgment.</p><div className="level-options">{[{ label: 'Beginner', desc: 'I’m learning the core concepts.', color: 'blue' }, { label: 'Intermediate', desc: 'I know the basics and want to apply them.', color: 'lime' }, { label: 'Advanced', desc: 'I’m ready for deeper systems and tradeoffs.', color: 'purple' }].map((item) => <button key={item.label} className={`level-card level-card--${item.color}${form.skillLevel === item.label ? ' is-selected' : ''}`} onClick={() => setForm({ ...form, skillLevel: item.label })}><span className="level-radio" /><strong>{item.label}</strong><small>{item.desc}</small><span className="level-signal"><i /><i /><i /></span></button>)}</div></div>}
        {step === 4 && <div className="onboarding-question"><h1>What matters<br />most right now?</h1><p>Pick a primary goal. We’ll connect your learning and building to this outcome.</p><div className="onboarding-option-grid onboarding-goal-grid">{goals.map((goal) => <button key={goal} className={`onboarding-goal${form.primaryGoal === goal ? ' is-selected' : ''}`} onClick={() => setForm({ ...form, primaryGoal: goal })}><span>{goal}</span><small>{goalDescriptions[goal]}</small>{form.primaryGoal === goal && <Check size={14} className="choice-check" />}</button>)}</div></div>}
        {step === 5 && <div className="onboarding-question"><h1>What’s in your<br />toolbox?</h1><p>Select what you’ve touched, even a little. You can add more as you go.</p><div className="technology-pills">{technologies.map((technology) => <button key={technology} onClick={() => toggleTechnology(technology)} className={`technology-pill${form.technologies.includes(technology) ? ' is-selected' : ''}`}><span>{form.technologies.includes(technology) ? <Check size={13} /> : <span className="tech-plus">+</span>}</span>{technology}</button>)}</div><form className="custom-tech-form" onSubmit={addCustom}><input value={customTech} onChange={(e) => setCustomTech(e.target.value)} maxLength={40} placeholder="Add another technology" aria-label="Add another technology" /><button type="submit" disabled={!customTech.trim() || form.technologies.length >= 12}>Add <ArrowRight size={13} /></button></form><p className="onboarding-selection-count">{form.technologies.length} selected <span>·</span> Self-reported skills stay clearly labeled.</p></div>}
        {step === 6 && <div className="onboarding-question"><h1>How much time<br />can you invest?</h1><p>We’ll pace your personalized sequence around a realistic week.</p><div className="availability-options">{[{ label: '2–5 hours', per: 'per week', width: 26 }, { label: '5–10 hours', per: 'per week', width: 45 }, { label: '10–20 hours', per: 'per week', width: 69 }, { label: '20+ hours', per: 'per week', width: 90 }].map((item, index) => <button key={item.label} className={`availability-card${form.weeklyHours === item.label ? ' is-selected' : ''}`} onClick={() => setForm({ ...form, weeklyHours: item.label })}><span className="availability-index">0{index + 1}</span><strong>{item.label}</strong><small>{item.per}</small><span className="availability-bar"><i style={{ width: `${item.width}%` }} /></span>{form.weeklyHours === item.label && <Check size={15} className="choice-check" />}</button>)}</div><div className="onboarding-plan-preview"><span className="plan-preview-icon"><Sparkles size={15} /></span><div><b>Your first roadmap is ready to shape.</b><small>{form.branch || 'Engineering'} · {form.primaryGoal || 'Your goal'} · built for {form.weeklyHours || 'your schedule'}</small></div></div></div>}
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
        <div className="onboarding-actions"><button className="onboarding-back" disabled={step === 0 || busy} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={15} /> Back</button><button className="button button--primary button--lg onboarding-next" disabled={!canContinue() || busy} onClick={next}>{busy ? <><span className="spinner" /> Building your path…</> : step === steps.length - 1 ? <>Build my learning path <ArrowRight size={16} /></> : <>Continue <ArrowRight size={16} /></>}</button></div>
      </div><p className="onboarding-privacy"><span className="privacy-dot" /> Your profile and projects are private by default. <Link href="/settings">Privacy details</Link></p></div>
  </main>;
}

function CompassIcon() { return <span className="compass-mark">◎</span>; }
