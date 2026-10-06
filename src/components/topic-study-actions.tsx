'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Copy, LoaderCircle, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from './ui';

type Action = 'simple' | 'example' | 'notes' | 'ask';
const actionLabel: Record<Action, string> = { simple: 'Explain simply', example: 'Give an example', notes: 'Create revision notes', ask: 'Ask NEXORA AI' };

export function TopicStudyActions({ topic, content, isComplete, aiConfigured }: { topic: { id: string; slug: string; title: string }; content: string; isComplete: boolean; aiConfigured: boolean }) {
  const router = useRouter();
  const [completed, setCompleted] = useState(isComplete);
  const [saving, setSaving] = useState(false);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [copied, setCopied] = useState(false);
  const [questionText, setQuestionText] = useState('');

  async function markComplete() {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/learning/${topic.slug}/progress`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ completed: !completed }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save progress.');
      setCompleted(!completed); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save progress.'); }
    finally { setSaving(false); }
  }
  async function runAction(action: Action) {
    setError(''); setAnswer(''); setFeedback(null); setActiveAction(action);
    const instruction = action === 'simple' ? `Explain the concept simply for an engineering student new to it. Use one analogy, one accurate example, and one self-check.`
      : action === 'example' ? `Give one worked example for this concept. Show assumptions, formula if relevant, steps, units, and a quick check.`
        : action === 'notes' ? `Create concise revision notes with key definitions, key steps, common mistakes, and three recall questions.`
          : `Answer this question about the concept: ${questionText.trim()}`;
    if (action === 'ask' && questionText.trim().length < 2) { setError('Write a question about this lesson first.'); setActiveAction(null); return; }
    try {
      const response = await fetch('/api/ai/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'study', message: `${instruction}\n\nTopic: ${topic.title}\n\nReference material from NEXORA learning content:\n${content.slice(0, 5000)}` }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'The AI request failed.');
      setAnswer(result.answer);
    } catch (e) { setError(e instanceof Error ? e.message : 'The AI request failed.'); }
    finally { setActiveAction(null); }
  }
  async function copyAnswer() {
    try { await navigator.clipboard.writeText(answer); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setError('Clipboard access was denied by your browser.'); }
  }

  return <>
    <div className="topic-action-rail"><button className={`topic-complete-button${completed ? ' is-complete' : ''}`} disabled={saving} onClick={markComplete}>{saving ? <LoaderCircle className="spin-icon" size={16} /> : completed ? <Check size={16} /> : <span className="empty-check" />}{completed ? 'Topic completed' : 'Mark as complete'}</button><Link className="button button--primary" href={`/practice?topic=${topic.slug}`}>Practice this topic <ArrowRight size={14} /></Link></div>
    <section className="topic-ai-panel"><div className="topic-ai-panel-heading"><div><span className="card-eyebrow"><Sparkles size={13} /> STUDY TOOLS</span><h2>Make the concept stick.</h2><p>Use the lesson as context, then ask for a different explanation or practice angle.</p></div><span className={`ai-provider-status${aiConfigured ? ' is-connected' : ''}`}><i />{aiConfigured ? 'AI provider connected' : 'AI provider not configured'}</span></div>{aiConfigured && <div className="topic-ask-input"><input value={questionText} onChange={(event) => setQuestionText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && questionText.trim()) void runAction('ask'); }} placeholder="Ask a specific question about this lesson…" aria-label="Ask about this topic" /><button disabled={!questionText.trim() || !!activeAction} onClick={() => runAction('ask')}>Ask <ArrowRight size={13} /></button></div>}<div className="topic-ai-action-list">{(['simple', 'example', 'notes'] as Action[]).map((action) => <button disabled={!aiConfigured || !!activeAction} key={action} className="topic-ai-action" onClick={() => runAction(action)}><span className="topic-ai-action-icon"><Sparkles size={14} /></span><span>{actionLabel[action]}</span>{activeAction === action ? <LoaderCircle className="spin-icon" size={14} /> : <ArrowRight size={14} />}</button>)}</div>{!aiConfigured && <p className="ai-unconfigured-note">The curated lesson and practice remain available. Configure a server-side <code>AI_API_KEY</code> to enable generated explanations.</p>}{error && <div className="form-alert form-alert--error topic-ai-error" role="alert">{error}</div>}{activeAction && <div className="ai-generating-status"><span className="spinner" /><span>Preparing a focused study response…</span></div>}{answer && <div className="ai-answer-block"><div className="ai-answer-header"><span><Sparkles size={13} /> AI-GENERATED STUDY RESPONSE</span><button onClick={copyAnswer}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div><div className="ai-answer-content">{answer}</div><div className="ai-answer-footer"><span>Grounded in this topic’s lesson. Verify formulas and assumptions.</span><div><button aria-label="Helpful" onClick={() => setFeedback('helpful')} className={feedback === 'helpful' ? 'is-selected' : ''}><ThumbsUp size={13} /></button><button aria-label="Not helpful" onClick={() => setFeedback('not_helpful')} className={feedback === 'not_helpful' ? 'is-selected' : ''}><ThumbsDown size={13} /></button></div></div></div>}</section>
  </>;
}
