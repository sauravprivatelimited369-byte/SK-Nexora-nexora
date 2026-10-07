'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, FileCode2, Lightbulb, LoaderCircle, ShieldAlert, Sparkles, Terminal } from 'lucide-react';
import { Button, Card } from './ui';

type Mode = 'debug' | 'study' | 'project';
type Response = { answer: string; citations: string | null; conversationId: string };

export function AiEngineerPanel({ aiConfigured, projectId, compact = false }: { aiConfigured: boolean; projectId?: string; compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('debug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!message.trim()) return;
    setError(''); setBusy(true); setResponse(null);
    try {
      const result = await fetch('/api/ai/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: message.trim(), mode, conversationId, projectId }) });
      const data = await result.json(); if (!result.ok) throw new Error(data.error || 'The AI request failed.');
      setResponse({ answer: data.answer, citations: data.citations, conversationId: data.conversationId }); setConversationId(data.conversationId);
    } catch (e) { setError(e instanceof Error ? e.message : 'The AI request failed.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!response) return;
    try { await navigator.clipboard.writeText(response.answer); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setError('Your browser denied clipboard access.'); }
  }

  return <div className={`ai-engineer-panel${compact ? ' ai-engineer-panel--compact' : ''}`}>
    <div className="ai-engineer-intro"><div className="ai-engineer-intro-icon"><Sparkles size={19} /></div><div><span className="card-eyebrow">NEXORA ENGINEERING COPILOT</span><h2>Reason it through.<br />Then take the next step.</h2><p>Share code, a failure, an architecture, or a constraint. Get a structured response—not a code dump.</p></div><span className={`ai-live-indicator${aiConfigured ? ' is-ready' : ''}`}><i />{aiConfigured ? 'PROVIDER READY' : 'PROVIDER OFF'}</span></div>
    {!aiConfigured && <div className="ai-configuration-notice"><span><ShieldAlert size={16} /></span><div><strong>No model is configured for this environment.</strong><p>This copilot does not fabricate AI responses. Add a server-side <code>AI_API_KEY</code> to enable real requests. Learning, project planning, and practice still work without it.</p></div></div>}
    <div className="ai-engineer-layout"><section className="ai-prompt-column"><div className="ai-mode-tabs" role="tablist" aria-label="Copilot mode"><button className={mode === 'debug' ? 'is-active' : ''} onClick={() => setMode('debug')}><Terminal size={13} /> Debug</button><button className={mode === 'project' ? 'is-active' : ''} onClick={() => setMode('project')}><FileCode2 size={13} /> Design review</button><button className={mode === 'study' ? 'is-active' : ''} onClick={() => setMode('study')}><Lightbulb size={13} /> Explain</button></div><form onSubmit={submit} className="ai-engineer-form"><label htmlFor="copilot-input">WHAT ARE YOU WORKING THROUGH?</label><textarea id="copilot-input" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={8000} rows={compact ? 9 : 12} placeholder={mode === 'debug' ? 'Paste the smallest failing code, error message, and what you expected to happen…' : mode === 'project' ? 'Describe a design decision, architecture, trade-off, or constraint…' : 'Ask about a concept. Include context and what you have tried…'} disabled={!aiConfigured || busy} /><div className="ai-input-footer"><span><span className="prompt-live-dot" /> {projectId ? 'Project plan and your saved artifacts are available as context.' : 'Only the information you provide in this request is used.'}</span><span>{message.length}/8,000</span></div>{error && <div className="form-alert form-alert--error" role="alert">{error}<button type="button" onClick={() => setError('')}>Dismiss</button></div>}<Button type="submit" disabled={!aiConfigured || busy || message.trim().length < 2} className="ai-submit-button">{busy ? <><LoaderCircle className="spin-icon" size={15} /> Working through it…</> : <><Sparkles size={15} /> Ask NEXORA Engineer <ArrowRight size={15} /></>}</Button><p className="ai-form-note">AI usage is metered on your plan. Technical suggestions should be tested and reviewed before deployment.</p></form></section>
      <section className="ai-output-column"><div className="ai-output-header"><div><span className="card-eyebrow">ENGINEERING RESPONSE</span><h3>{response ? 'A focused next step.' : 'What you’ll get.'}</h3></div><span className="ai-output-symbol"><Sparkles size={16} /></span></div>{busy ? <div className="ai-output-loading"><span className="ai-loading-orbit"><Sparkles size={16} /></span><strong>Working through the details…</strong><span>Building a structured response</span><div className="ai-loading-bars"><i /><i /><i /></div></div> : response ? <div className="ai-response-result"><div className="ai-response-result-top"><span><Sparkles size={13} /> AI-GENERATED</span><button onClick={() => void copy()}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div><div className="ai-response-text">{response.answer}</div><div className="ai-response-result-foot"><span>{response.citations ? `Context: ${response.citations}` : 'Context: this conversation only'}</span><span>Not independently verified</span></div></div> : <div className="ai-output-placeholder"><div className="ai-output-grid" /><span className="placeholder-orbit"><i /><b /><em /></span><div className="placeholder-response-copy"><span>STRUCTURED BY DESIGN</span><h4>Problem<br /><b>Root cause</b><br />Fix <i>Why it works</i><br />Test</h4><p>Responses adapt to your context and selected mode.</p></div><div className="placeholder-citation"><Check size={11} /> Clear assumptions</div></div>}
        <div className="ai-output-guarantee"><span><Check size={13} /></span><p><strong>No false claims.</strong> NEXORA does not say it ran code, verified a skill, or retrieved a source it did not see.</p></div></section></div>
  </div>;
}
