'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CircleHelp, LoaderCircle, Sparkles, WandSparkles } from 'lucide-react';

const prompts = [
  'I want to build an AI-powered smart agriculture monitoring system for small farms.',
  'I want to build a campus energy monitor that helps students understand electricity use.',
  'I want to build a full-stack project tracker with secure accounts and a useful dashboard.',
];

export function ProjectBuilderForm({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stepLabel, setStepLabel] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    setStepLabel(aiConfigured ? 'Mapping your idea into an engineering plan…' : 'Building a structured starter blueprint…');
    try {
      const response = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create your project.');
      router.push(`/projects/${result.projectId}?created=${result.source}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); setBusy(false); setStepLabel(''); }
  }

  return <form className="project-builder-form" onSubmit={submit}>
    <label htmlFor="project-brief" className="project-brief-label"><span>PROJECT BRIEF</span><span><CircleHelp size={12} /> Specificity helps</span></label>
    <div className="project-prompt-wrap"><span className="prompt-spark"><WandSparkles size={17} /></span><textarea id="project-brief" required minLength={12} maxLength={2400} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="I want to build an AI-powered smart agriculture monitoring system for small farms. It should track soil conditions, surface irrigation alerts, and be affordable to prototype…" rows={7} disabled={busy} /><div className="project-prompt-bottom"><span><span className="prompt-live-dot" /> {prompt.length ? 'Brief saved in this form' : 'Describe the problem, the people affected, and the outcome'}</span><span>{prompt.length}/2,400</span></div></div>
    <div className="project-prompt-examples"><span>NEED A STARTING POINT?</span>{prompts.map((example, index) => <button type="button" key={example} className="prompt-example" onClick={() => setPrompt(example)} disabled={busy}><span>0{index + 1}</span>{example}<ArrowRight size={13} /></button>)}</div>
    {error && <div className="form-alert form-alert--error" role="alert">{error}<button type="button" onClick={() => setError('')}>Dismiss</button></div>}
    <button className="button button--primary button--lg builder-submit" disabled={busy || prompt.trim().length < 12}>{busy ? <><LoaderCircle className="spin-icon" size={16} /> {stepLabel}</> : <>{aiConfigured ? <Sparkles size={16} /> : <Check size={16} />} Build my project workspace <ArrowRight size={16} /></>}</button>
    <p className="builder-form-footnote">{aiConfigured ? 'AI-generated plan · usage is metered after a successful provider response.' : 'Starter blueprint · editable, structured, and saved to your account.'}</p>
  </form>;
}
