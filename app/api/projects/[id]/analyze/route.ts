import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, recordAudit, recordEvent, requestIp } from '@/lib/api';
import { assertAiUsageAvailable, chatCompletion, extractJson, isAiConfigured } from '@/lib/ai';
import { query, transaction } from '@/lib/db';

const aiSchema = z.object({
  summary: z.string().min(10).max(600),
  scores: z.object({ architecture: z.number().int().min(0).max(100), security: z.number().int().min(0).max(100), code_quality: z.number().int().min(0).max(100), documentation: z.number().int().min(0).max(100), testing: z.number().int().min(0).max(100) }),
  recommendations: z.array(z.string().min(8).max(400)).max(10),
  skill_evidence: z.array(z.object({ skill: z.string().min(2).max(80), file: z.string().min(1).max(120), excerpt: z.string().min(5).max(300), rationale: z.string().min(5).max(240) })).max(20),
});

type FileEvidence = { filename: string; content: string };
type ScoreCard = { score: number; method: string };

function checklistScore(condition: boolean, partial: boolean): number {
  return condition ? 90 : partial ? 55 : 20;
}

function localReview(files: FileEvidence[], project: { title: string; description: string }, requiredSkills: string[]) {
  const joined = files.map((file) => `${file.filename}\n${file.content}`).join('\n\n');
  const lower = joined.toLowerCase();
  const names = files.map((file) => file.filename.toLowerCase());
  const hasCode = names.some((name) => /\.(ts|tsx|js|jsx|py|java|c|cpp|ino|sql)$/.test(name));
  const hasTests = /test|assert|expect\(|pytest|unittest|jest|vitest/i.test(joined) || names.some((name) => /test|spec/.test(name));
  const hasArchitecture = /architecture|data flow|system design|component diagram|sequence diagram/i.test(joined);
  const hasSecurity = /security|authentication|authorization|secret|threat|tls|encryption|access control/i.test(joined);
  const hasDocs = names.some((name) => /readme|docs|architecture/.test(name)) || /##\s+(setup|overview|installation|architecture)/i.test(joined);
  const hasTestPlan = /test plan|test case|integration test|unit test|edge case|assert/i.test(joined);
  const scores: Record<string, ScoreCard> = {
    architecture: { score: checklistScore(hasArchitecture, /system|component|api|database/i.test(joined)), method: 'Architecture terms present in user-provided text' },
    security: { score: checklistScore(hasSecurity, /auth|access|credential|input/i.test(joined)), method: 'Security-control terms present in user-provided text' },
    code_quality: { score: hasCode ? (joined.length > 500 ? 65 : 45) : 20, method: hasCode ? 'Code artifact exists; no code execution or static analysis performed' : 'No recognized source-code file was provided' },
    documentation: { score: checklistScore(hasDocs, joined.length > 250), method: 'README/documentation structure and text coverage' },
    testing: { score: hasTests || hasTestPlan ? 85 : 20, method: 'Test artifact, test-plan, or assertion terms present' },
  };
  const skillEvidence = requiredSkills.flatMap((skill) => {
    const pattern = new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matched = files.find((file) => pattern.test(file.content));
    if (!matched) return [];
    const index = matched.content.toLowerCase().indexOf(skill.toLowerCase());
    const excerpt = matched.content.slice(Math.max(0, index - 50), Math.min(matched.content.length, index + skill.length + 100)).trim();
    return [{ skill, file: matched.filename, excerpt, rationale: 'The skill is explicitly mentioned in a user-provided project artifact; this is evidence of use, not verification.' }];
  });
  const recommendations: string[] = [];
  if (!hasArchitecture) recommendations.push('Add a simple architecture diagram or a written data-flow section to the project documentation.');
  if (!hasSecurity) recommendations.push('Document authentication, ownership boundaries, secret handling, and one relevant threat or safety risk.');
  if (!hasCode) recommendations.push('Add a representative source file so the workspace contains implementation evidence.');
  if (!hasDocs) recommendations.push('Add a README with purpose, setup, assumptions, and a short architecture overview.');
  if (!hasTests && !hasTestPlan) recommendations.push('Add at least one repeatable test for normal behavior and one failure or boundary case.');
  if (!skillEvidence.length) recommendations.push('Mention technologies in a code file, README, or test artifact only when they were actually used; project-plan skills do not count as demonstrated evidence.');
  const average = Math.round(Object.values(scores).reduce((sum, value) => sum + value.score, 0) / Object.keys(scores).length);
  return {
    mode: 'evidence_checklist',
    summary: `A text-only coverage check of ${files.length} user-provided artifact${files.length === 1 ? '' : 's'} for ${project.title}. This does not execute code or certify engineering quality.`,
    scores,
    overall: average,
    recommendations: recommendations.slice(0, 8),
    skill_evidence: skillEvidence,
    disclaimer: 'Checklist scores describe observable artifact coverage only. No code was run, security test was performed, or skill verified.',
  };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to analyze a project.', 'UNAUTHENTICATED');
    const { id } = await context.params;
    await enforceRateLimit(user.id, 'project-analysis', 10, 60 * 60);
    const projectResult = await query<{ id: string; title: string; description: string; generated_json: string }>('SELECT id,title,description,generated_json FROM projects WHERE id=$1 AND user_id=$2', [id, user.id]);
    const project = projectResult.rows[0];
    if (!project) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
    const filesResult = await query<FileEvidence>('SELECT filename,content FROM project_files WHERE project_id=$1 AND user_id=$2 ORDER BY created_at', [id, user.id]);
    if (!filesResult.rowCount) throw new HttpError(400, 'Add a README, source file, test notes, or implementation artifact before analysis. A generated plan alone is not evidence of work.', 'EVIDENCE_REQUIRED');
    const files = filesResult.rows;
    const generated = JSON.parse(project.generated_json) as { required_skills?: string[] };
    let analysis: Record<string, unknown>;

    if (isAiConfigured()) {
      await assertAiUsageAvailable(user.id);
      const sourceText = files.map((file) => `--- FILE: ${file.filename} ---\n${file.content.slice(0, 30_000)}`).join('\n\n');
      const completion = await chatCompletion([
        { role: 'system', content: 'You are a careful engineering reviewer. Review only the supplied plan and user-provided text artifacts. Never claim code was executed, a vulnerability was proven, or a skill was verified. Scores are AI estimates based on visible text, not certifications. Cite every skill-evidence item with an exact excerpt copied from a supplied filename. Do not produce an evidence item if no exact supporting excerpt exists. Return only JSON.' },
        { role: 'user', content: `Review project ${project.title}. Plan: ${project.description}\nRequired skills (planned, not yet demonstrated): ${(generated.required_skills || []).join(', ')}\n\nUser-provided evidence:\n${sourceText}\n\nReturn JSON: {summary:string, scores:{architecture:0-100,security:0-100,code_quality:0-100,documentation:0-100,testing:0-100}, recommendations:string[], skill_evidence:[{skill,file,excerpt,rationale}]}. Limit recommendations to actionable items. The code has not been executed; do not imply otherwise.` },
      ], { temperature: 0.15, maxTokens: 1800, userId: user.id, kind: 'project_analyzer' });
      const parsed = aiSchema.safeParse(extractJson<unknown>(completion.text));
      if (!parsed.success) throw new HttpError(502, 'The AI returned an incomplete project review. Please retry.', 'AI_INVALID_REVIEW');
      const cited = parsed.data.skill_evidence.filter((item) => files.some((file) => file.filename === item.file && file.content.includes(item.excerpt)));
      const scores = Object.fromEntries(Object.entries(parsed.data.scores).map(([key, score]) => [key, { score, method: 'AI-estimated from supplied text; no execution or static analysis' }]));
      const overall = Math.round(Object.values(parsed.data.scores).reduce((sum, score) => sum + score, 0) / 5);
      analysis = {
        mode: 'ai_estimate', summary: parsed.data.summary, scores, overall,
        recommendations: parsed.data.recommendations,
        skill_evidence: cited,
        disclaimer: 'AI-estimated from the supplied text. Code was not executed, a formal security review was not performed, and skills are not verified.',
      };
    } else {
      analysis = localReview(files, project, generated.required_skills || []);
    }

    const evidenceItems = analysis.skill_evidence as Array<{ skill: string; file: string; excerpt: string; rationale: string }>;
    await transaction(async (tx) => {
      await tx('UPDATE projects SET analysis_json=$1,updated_at=NOW() WHERE id=$2 AND user_id=$3', [JSON.stringify(analysis), id, user.id]);
      for (const item of evidenceItems) {
        const skillName = item.skill.trim().slice(0, 80);
        const matching = await tx<{ id: string; mastery: number }>(
          `SELECT s.id,COALESCE(us.mastery,0)::int AS mastery FROM skills s
           LEFT JOIN user_skills us ON us.skill_id=s.id AND us.user_id=$1
           WHERE LOWER(s.name)=LOWER($2)`,
          [user.id, skillName],
        );
        let skillId = matching.rows[0]?.id;
        if (!skillId) {
          skillId = `skill-${skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}` || randomUUID();
          await tx('INSERT INTO skills (id,name,category,description) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING', [skillId, skillName, 'Project Evidence', 'A skill referenced by the learner in a project artifact.']);
          const inserted = await tx<{ id: string; mastery: number }>('SELECT s.id,COALESCE(us.mastery,0)::int AS mastery FROM skills s LEFT JOIN user_skills us ON us.skill_id=s.id AND us.user_id=$1 WHERE LOWER(s.name)=LOWER($2)', [user.id, skillName]);
          skillId = inserted.rows[0]?.id ?? skillId;
        }
        const existing = await tx('SELECT id FROM skill_evidence WHERE user_id=$1 AND skill_id=$2 AND project_id=$3 AND source_type=$4', [user.id, skillId, id, 'project']);
        if (!existing.rowCount) {
          await tx('INSERT INTO skill_evidence (id,user_id,skill_id,project_id,source_type,evidence,confidence) VALUES ($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), user.id, skillId, id, 'project', `${item.file}: “${item.excerpt.slice(0, 240)}” — ${item.rationale}`, analysis.mode === 'ai_estimate' ? 60 : 45]);
          const base = Math.min(45, 12 + Math.min(6, Number((await tx<{ count: number }>('SELECT COUNT(*)::int AS count FROM project_tasks WHERE project_id=$1 AND completed=TRUE', [id])).rows[0]?.count ?? 0) * 4));
          await tx('INSERT INTO user_skills (id,user_id,skill_id,mastery,self_reported) VALUES ($1,$2,$3,$4,FALSE) ON CONFLICT (user_id,skill_id) DO UPDATE SET mastery=GREATEST(user_skills.mastery,EXCLUDED.mastery),updated_at=NOW()', [randomUUID(), user.id, skillId, base]);
        }
      }
    });
    await recordAudit(user.id, 'project.analyzed', 'project', id, { mode: analysis.mode, skills: evidenceItems.length }, requestIp(request));
    await recordEvent(user.id, 'project_analyzed', { project_id: id, mode: analysis.mode, skills_detected: evidenceItems.length });
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    return errorResponse(error);
  }
}
