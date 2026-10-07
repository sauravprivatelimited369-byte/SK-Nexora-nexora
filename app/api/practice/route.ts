import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordEvent } from '@/lib/api';
import { query, transaction } from '@/lib/db';
import { adaptiveDifficulty, masteryBand, updateMastery } from '@/lib/mastery';

const branchFor = (branch: string | null) => branch === 'AI/ML' || branch === 'Data Science' ? 'AI/ML & Data Science' : branch;
const topicSkill: Record<string, string> = {
  'python-functions': 'Python', 'http-rest': 'API Design', 'sql-joins': 'SQL', 'git-workflow': 'Git',
  'thermodynamics-first-law': 'Thermodynamics', 'fluid-continuity': 'Fluid Mechanics',
  'circuit-ohms-law': 'Circuit Analysis', 'embedded-sensors': 'Embedded Systems',
  'ac-power-basics': 'Circuit Analysis', 'cad-design-intro': 'CAD', 'civil-load-path': 'Structural Analysis',
  'ml-train-test': 'Machine Learning', 'chemical-mass-balance': 'Problem Solving',
};

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to start adaptive practice.', 'UNAUTHENTICATED');
    const url = new URL(request.url);
    const requestedTopic = url.searchParams.get('topic');
    const requestedCount = Math.min(8, Math.max(1, Number(url.searchParams.get('count') || 5)));
    let topicId = requestedTopic;
    if (topicId) {
      const exists = await query('SELECT id FROM topics WHERE id=$1 OR slug=$1', [topicId]);
      if (!exists.rowCount) throw new HttpError(404, 'Practice topic not found.', 'NOT_FOUND');
      topicId = String(exists.rows[0].id);
    } else {
      const branch = branchFor(user.branch);
      const best = await query<{ id: string }>(
        `SELECT t.id,COUNT(a.id)::int AS attempts,
          COALESCE(AVG(CASE WHEN a.is_correct THEN 1.0 ELSE 0.0 END),0.5) AS accuracy
         FROM topics t JOIN subjects s ON s.id=t.subject_id
         LEFT JOIN questions q ON q.topic_id=t.id
         LEFT JOIN attempts a ON a.question_id=q.id AND a.user_id=$1
         ${branch ? 'WHERE s.branch=$2' : ''}
         GROUP BY t.id
         ORDER BY CASE WHEN COUNT(a.id)>0 THEN AVG(CASE WHEN a.is_correct THEN 1.0 ELSE 0.0 END) ELSE 0.5 END ASC,
           COUNT(a.id) DESC,t.sort_order ASC
         LIMIT 1`,
        branch ? [user.id, branch] : [user.id],
      );
      topicId = best.rows[0]?.id;
    }
    if (!topicId) throw new HttpError(404, 'No practice questions are available for this profile yet.', 'NO_QUESTIONS');
    const stats = await query<{ attempts: number; accuracy: number }>(
      `SELECT COUNT(*)::int AS attempts,COALESCE(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END),0.5) AS accuracy
       FROM (SELECT a.is_correct FROM attempts a JOIN questions q ON q.id=a.question_id WHERE a.user_id=$1 AND q.topic_id=$2 ORDER BY a.created_at DESC LIMIT 5) recent`,
      [user.id, topicId],
    );
    const accuracy = Number(stats.rows[0]?.accuracy ?? 0.5);
    const recentAttempts = Number(stats.rows[0]?.attempts ?? 0);
    const targetDifficulty = adaptiveDifficulty(accuracy, recentAttempts);
    const topic = await query<{ id: string; title: string; slug: string; summary: string }>('SELECT id,title,slug,summary FROM topics WHERE id=$1', [topicId]);
    const questions = await query<{ id: string; prompt: string; choices: string; difficulty: number }>(
      `SELECT q.id,q.prompt,q.choices,q.difficulty FROM questions q
       WHERE q.topic_id=$1
       ORDER BY CASE WHEN q.id IN (SELECT question_id FROM attempts WHERE user_id=$2 ORDER BY created_at DESC LIMIT 3) THEN 1 ELSE 0 END,
         ABS(q.difficulty-$3),q.difficulty,q.id
       LIMIT $4`,
      [topicId, user.id, targetDifficulty, requestedCount],
    );
    return NextResponse.json({
      topic: topic.rows[0],
      questions: questions.rows.map((question) => ({ id: question.id, prompt: question.prompt, choices: JSON.parse(question.choices) as string[], difficulty: question.difficulty })),
      adaptive: { recentAccuracy: Math.round(accuracy * 100), targetDifficulty, recentAttempts, reason: recentAttempts < 2 ? 'Starting with foundational questions until there is enough practice history.' : accuracy < 0.5 ? 'Recent misses detected; serving foundational questions for targeted review.' : accuracy >= 0.75 ? 'Strong recent performance; increasing the challenge.' : 'Building consistency with focused practice.' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

const answerSchema = z.object({ questionId: z.string().uuid(), answer: z.string().min(1).max(240), durationSeconds: z.number().int().min(0).max(3600).default(0) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to save a practice attempt.', 'UNAUTHENTICATED');
    const parsed = answerSchema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'The submitted answer could not be validated.', 'INVALID_INPUT');
    const question = await query<{ id: string; answer: string; explanation: string; topic_id: string; topic_title: string; topic_slug: string }>(
      'SELECT q.id,q.answer,q.explanation,q.topic_id,t.title AS topic_title,t.slug AS topic_slug FROM questions q JOIN topics t ON t.id=q.topic_id WHERE q.id=$1',
      [parsed.data.questionId],
    );
    const item = question.rows[0];
    if (!item) throw new HttpError(404, 'Practice question not found.', 'NOT_FOUND');
    const correct = item.answer.trim().toLowerCase() === parsed.data.answer.trim().toLowerCase();
    const skillName = topicSkill[item.topic_slug] || 'Problem Solving';
    const skillId = `skill-${skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const response = await transaction(async (tx) => {
      await tx('INSERT INTO attempts (id,user_id,question_id,submitted_answer,is_correct,duration_seconds) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), user.id, item.id, parsed.data.answer, correct, parsed.data.durationSeconds]);
      await tx('INSERT INTO skills (id,name,category,description) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING', [skillId, skillName, 'Practice', 'Practice evidence from the NEXORA question bank.']);
      const skill = await tx<{ id: string; mastery: number }>('SELECT s.id,COALESCE(us.mastery,0)::int AS mastery FROM skills s LEFT JOIN user_skills us ON us.skill_id=s.id AND us.user_id=$1 WHERE LOWER(s.name)=LOWER($2)', [user.id, skillName]);
      const current = Number(skill.rows[0]?.mastery ?? 0);
      const mastery = updateMastery(current, correct);
      await tx('INSERT INTO user_skills (id,user_id,skill_id,mastery,self_reported) VALUES ($1,$2,$3,$4,FALSE) ON CONFLICT (user_id,skill_id) DO UPDATE SET mastery=EXCLUDED.mastery,self_reported=FALSE,updated_at=NOW()', [randomUUID(), user.id, skill.rows[0].id, mastery]);
      await tx('INSERT INTO skill_evidence (id,user_id,skill_id,source_type,evidence,confidence) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), user.id, skill.rows[0].id, 'practice', `${correct ? 'Correct' : 'Incorrect'} response to “${item.topic_title}” practice question. Practice mastery is recency-weighted and may change.`, mastery]);
      const totals = await tx<{ total: number; done: number }>('SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE is_correct=TRUE)::int AS done FROM attempts a JOIN questions q ON q.id=a.question_id WHERE a.user_id=$1 AND q.topic_id=$2', [user.id, item.topic_id]);
      const progress = totals.rows[0]?.total ? Math.round(Number(totals.rows[0].done) / Number(totals.rows[0].total) * 100) : 0;
      await tx('INSERT INTO user_progress (id,user_id,topic_id,status,completion_percent) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,topic_id) DO UPDATE SET completion_percent=GREATEST(user_progress.completion_percent,EXCLUDED.completion_percent)', [randomUUID(), user.id, item.topic_id, 'in_progress', Math.min(95, progress)]);
      return { mastery, progress };
    });
    await recordEvent(user.id, 'question_attempted', { topic: item.topic_slug, correct });
    return NextResponse.json({ ok: true, correct, expectedAnswer: correct ? undefined : item.answer, explanation: item.explanation, mastery: response.mastery, masteryBand: masteryBand(response.mastery), topicProgress: response.progress });
  } catch (error) {
    return errorResponse(error);
  }
}
