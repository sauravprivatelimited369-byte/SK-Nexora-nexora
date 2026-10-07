'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, ExternalLink, FileText, Play, Search, Sparkles } from 'lucide-react';
import { Badge, Card, ProgressBar } from './ui';

type Topic = { id: string; title: string; slug: string; summary: string; level: string; duration_minutes: number; branch: string; subject: string; progress_status: string | null; completion_percent: number | null };
type Resource = { id: string; title: string; kind: string; url: string; description: string; difficulty: string; branch: string };

export function LearningLibrary({ topics, resources, selectedBranch }: { topics: Topic[]; resources: Resource[]; selectedBranch: string }) {
  const [filter, setFilter] = useState('Recommended');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'topics' | 'resources'>('topics');
  const branches = useMemo(() => ['Recommended', ...Array.from(new Set(topics.map((topic) => topic.branch)))], [topics]);
  const filteredTopics = topics.filter((topic) => {
    const matchesBranch = filter === 'Recommended' ? topic.branch === selectedBranch || (selectedBranch === 'AI/ML' || selectedBranch === 'Data Science') && topic.branch === 'AI/ML & Data Science' : topic.branch === filter;
    const matchesSearch = `${topic.title} ${topic.summary} ${topic.subject} ${topic.branch}`.toLowerCase().includes(search.toLowerCase());
    return matchesBranch && matchesSearch;
  });
  const filteredResources = resources.filter((resource) => `${resource.title} ${resource.kind} ${resource.description} ${resource.branch}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <div className="learning-library-tools"><div className="learning-tabs"><button className={tab === 'topics' ? 'is-active' : ''} onClick={() => setTab('topics')}><BookOpen size={14} /> Topics <span>{topics.length}</span></button><button className={tab === 'resources' ? 'is-active' : ''} onClick={() => setTab('resources')}><FileText size={14} /> Resources <span>{resources.length}</span></button></div><label className="library-search"><Search size={15} /><input aria-label="Search learning library" placeholder="Search topics and resources…" value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>/</kbd></label></div>
    {tab === 'topics' ? <>
      <div className="branch-filter-row" aria-label="Filter by engineering branch">{branches.map((branch) => <button key={branch} className={`branch-filter-chip${filter === branch ? ' is-active' : ''}`} onClick={() => setFilter(branch)}>{branch === 'Recommended' && <Sparkles size={12} />}{branch}</button>)}</div>
      {filteredTopics.length ? <div className="topic-card-grid">{filteredTopics.map((topic, index) => <Card className={`topic-library-card${topic.progress_status === 'completed' ? ' topic-library-card--done' : ''}`} key={topic.id}><div className="topic-library-top"><span className={`topic-index-badge topic-index-badge--${index % 4}`}>{String(index + 1).padStart(2, '0')}</span><Badge tone={topic.progress_status === 'completed' ? 'lime' : 'neutral'}>{topic.progress_status === 'completed' ? 'COMPLETED' : topic.progress_status === 'in_progress' ? 'IN PROGRESS' : topic.level.toUpperCase()}</Badge><span className="topic-library-menu">{topic.progress_status === 'completed' ? <CheckCircle2 size={15} /> : <ArrowUpRight size={15} />}</span></div><div className="topic-library-subject">{topic.branch.toUpperCase()} <span>·</span> {topic.subject}</div><h3>{topic.title}</h3><p>{topic.summary}</p><div className="topic-card-foot"><span><Clock3 size={12} /> {topic.duration_minutes} min</span><span>{topic.level}</span></div>{topic.progress_status === 'in_progress' && <ProgressBar className="topic-progress-bar" value={topic.completion_percent || 12} color="blue" />}<Link href={`/learn/${topic.slug}`} className="topic-card-link" aria-label={`${topic.progress_status === 'completed' ? 'Review' : 'Study'} ${topic.title}`}>{topic.progress_status === 'completed' ? 'Review concept' : topic.progress_status === 'in_progress' ? 'Continue topic' : 'Start topic'} <ArrowRight size={14} /></Link></Card>)}</div> : <div className="library-empty"><Search size={20} /><h3>No topics match that search.</h3><p>Try a different keyword or browse another discipline.</p></div>}
    </> : <div className="resources-grid">{filteredResources.map((resource) => <Card className="resource-card" key={resource.id}><div className="resource-card-top"><span className="resource-icon"><ExternalLink size={15} /></span><span className="resource-kind">{resource.kind}</span></div><h3>{resource.title}</h3><p>{resource.description}</p><div className="resource-meta"><span>{resource.branch}</span><span>·</span><span>{resource.difficulty}</span></div><a href={resource.url} target="_blank" rel="noreferrer" className="resource-link">Open resource <ExternalLink size={13} /></a></Card>)}{!filteredResources.length && <div className="library-empty"><Search size={20} /><h3>No resources match.</h3><p>Try another search term.</p></div>}</div>}
    <div className="library-footnote"><span><CheckCircle2 size={13} /> Learning content is reviewed and maintained by NEXORA.</span><span>External links open their original source <ExternalLink size={12} /></span></div>
  </>;
}
