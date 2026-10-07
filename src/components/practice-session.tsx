'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Clock3, RotateCcw, Sparkles, Target, X } from 'lucide-react';
import { Badge, Button, Card, ProgressBar } from './ui';

type Question = { id: string; prompt: string; choices: string[]; difficulty: number };
type SessionData = { topic: { id: string; title: string; slug: string; summary: string }; questions: Question[]; adaptive: { recentAccuracy: number; targetDifficulty: number; recentAttempts: number; reason: string } };
type Result = { correct: boolean; expectedAnswer?: string; explanation: string; mastery: number; masteryBand: string; topicProgress: number };

export function PracticeSession({ topicSlug, initialTopic }: { topicSlug?: string; initialTopic: { title: string; summary: string } | null }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [currentResult, setCurrentResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true); setError(''); setSession(null); setResults([]); setCurrentIndex(0); setSelected(''); setCurrentResult(null);
    try {
      const query = new URLSearchParams({ count: '5' }); if (topicSlug) query.set('topic', topicSlug);
      const response = await fetch(`/api/practice?${query}`); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load a practice set.');
      setSession(data); setQuestionStartedAt(Date.now());
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load a practice set.'); }
    finally { setLoading(false); }
  }, [topicSlug]);
  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!session || !selected || submitting) return;
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/practice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId: session.questions[currentIndex].id, answer: selected, durationSeconds: Math.round((Date.now() - questionStartedAt) / 1000) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save your attempt.');
      setCurrentResult(result); setResults((previous) => [...previous, result]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your attempt.'); }
    finally { setSubmitting(false); }
  }
  function next() { if (!session) return; setCurrentIndex((index) => index + 1); setSelected(''); setCurrentResult(null); setQuestionStartedAt(Date.now()); }
  const finished = !!session && currentIndex >= session.questions.length;
  const currentQuestion = session?.questions[currentIndex];

  if (loading) return <div className="practice-loading"><div className="skeleton-line skeleton-line--wide" /><div className="skeleton-line" /><div className="skeleton-question-card"><div className="skeleton-line skeleton-line--wide" /><div className="skeleton-line" /><div className="skeleton-choice" /><div className="skeleton-choice" /><div className="skeleton-choice" /></div></div>;
  if (error && !session) return <Card className="practice-error-card"><span className="practice-error-icon"><CircleHelp size={19} /></span><h2>Practice set unavailable.</h2><p>{error}</p><Button onClick={() => void load()}>Retry <RotateCcw size={14} /></Button></Card>;
  if (!session || !currentQuestion) return <Card className="practice-error-card"><h2>No questions found.</h2><p>Try another branch or topic.</p><Link className="button button--secondary" href="/learn">Browse learning <ArrowRight size={14} /></Link></Card>;

  if (finished) {
    const correct = results.filter((result) => result.correct).length;
    const percent = results.length ? Math.round(correct / results.length * 100) : 0;
    return <Card className="practice-complete-card"><div className="practice-complete-orbit"><span><Target size={23} /></span></div><div className="practice-complete-kicker"><span className="live-dot" /> SESSION COMPLETE</div><h2>{percent >= 80 ? 'Solid understanding.' : percent >= 50 ? 'Good progress.' : 'A useful place to start.'}</h2><p>You answered {correct} of {results.length} correctly in <strong>{session.topic.title}</strong>. Your mastery estimate has been updated from this session.</p><div className="practice-summary-metrics"><div><strong>{percent}%</strong><small>session accuracy</small></div><div><strong>{results.at(-1)?.mastery ?? 0}</strong><small>mastery · {results.at(-1)?.masteryBand ?? 'Beginner'}</small></div><div><strong>{session.adaptive.targetDifficulty}</strong><small>starting difficulty</small></div></div><div className="practice-complete-actions"><Button onClick={() => { void load(); router.refresh(); }}><RotateCcw size={14} /> Practice again</Button><Link href={`/learn/${session.topic.slug}`} className="button button--secondary">Review the lesson <ArrowRight size={14} /></Link><Link href="/skills" className="practice-text-link">View skill graph <ArrowRight size={13} /></Link></div><div className="practice-score-disclaimer"><Sparkles size={13} /> Recency-weighted practice estimate. A practice set does not verify professional competency.</div></Card>;
  }

  return <div className="practice-work-area"><div className="practice-session-heading"><div><div className="practice-topic-label"><span className="practice-topic-icon"><Target size={14} /></span><span>{session.topic.title}</span><span className="practice-heading-dot">·</span><span>{session.questions.length} questions</span></div><div className="practice-adaptive-status"><Sparkles size={12} /> {session.adaptive.reason}</div></div><div className="practice-session-time"><Clock3 size={13} /> Focus mode</div></div>
    <Card className="practice-question-card"><div className="practice-question-top"><div className="practice-question-count"><span>QUESTION</span><strong>{String(currentIndex + 1).padStart(2, '0')}<small> / {String(session.questions.length).padStart(2, '0')}</small></strong></div><ProgressBar value={(currentIndex / session.questions.length) * 100} color="blue" className="practice-question-progress" /><Badge tone={currentQuestion.difficulty <= 1 ? 'lime' : currentQuestion.difficulty >= 3 ? 'orange' : 'blue'}>{currentQuestion.difficulty <= 1 ? 'FOUNDATION' : currentQuestion.difficulty >= 3 ? 'CHALLENGE' : 'CORE'}</Badge></div><h2>{currentQuestion.prompt}</h2><div className="practice-choice-list" role="radiogroup" aria-label="Answer choices">{currentQuestion.choices.map((choice, index) => {
      const isSelected = selected === choice;
      const isExpected = currentResult?.expectedAnswer === choice;
      const isWrongSelected = currentResult && isSelected && !currentResult.correct;
      return <button type="button" key={choice} role="radio" aria-checked={isSelected} disabled={!!currentResult} className={`practice-choice${isSelected ? ' is-selected' : ''}${isExpected ? ' is-correct' : ''}${isWrongSelected ? ' is-wrong' : ''}`} onClick={() => setSelected(choice)}><span className="practice-choice-letter">{String.fromCharCode(65 + index)}</span><span>{choice}</span><span className="practice-choice-state">{isSelected && currentResult ? currentResult.correct ? <Check size={16} /> : <X size={15} /> : isSelected ? <span /> : null}</span></button>;
    })}</div>{currentResult && <div className={`practice-answer-feedback${currentResult.correct ? ' is-correct' : ' is-incorrect'}`}><span className="feedback-result-icon">{currentResult.correct ? <Check size={15} /> : <X size={15} />}</span><div><strong>{currentResult.correct ? 'That’s right.' : `Not quite. The answer is “${currentResult.expectedAnswer}”.`}</strong><p>{currentResult.explanation}</p></div></div>}{error && <div className="form-alert form-alert--error" role="alert">{error}</div>}<div className="practice-question-footer"><span><CircleHelp size={13} /> {currentResult ? `Mastery estimate: ${currentResult.mastery} · ${currentResult.masteryBand}` : 'Choose the best answer.'}</span>{!currentResult ? <Button disabled={!selected || submitting} onClick={() => void submit()}>{submitting ? 'Saving…' : 'Check answer'} <ArrowRight size={14} /></Button> : <Button onClick={next}>{currentIndex === session.questions.length - 1 ? 'See results' : 'Next question'} <ArrowRight size={14} /></Button>}</div></Card>
    <div className="practice-session-foot"><span>Adaptation is based on your recent answers for this topic.</span><span><a href="/learn">Browse other topics</a> <ArrowRight size={12} /></span></div>
  </div>;
}
