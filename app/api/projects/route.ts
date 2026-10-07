import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, recordAudit, recordEvent, requestIp } from '@/lib/api';
import { assertAiUsageAvailable, getPlanForUser, isAiConfigured } from '@/lib/ai';
import { query, transaction } from '@/lib/db';
import { generateProjectBlueprint } from '@/lib/project-planner';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to view your projects.', 'UNAUTHENTICATED');
    const result = await query<Record<string, unknown>>(
      `SELECT p.id,p.title,p.description,p.status,p.difficulty,p.progress,p.created_at,p.updated_at,
        COUNT(t.id)::int AS task_count,
        COUNT(t.id) FILTER (WHERE t.completed=TRUE)::int AS completed_task_count
       FROM projects p LEFT JOIN project_tasks t ON t.project_id=p.id
       WHERE p.user_id=$1 AND p.status<>'archived'
       GROUP BY p.id ORDER BY p.updated_at DESC`,
      [user.id],
    );
    return NextResponse.json({ projects: result.rows });
  } catch (error) {
    return errorResponse(error);
  }
}

const schema = z.object({ prompt: z.string().trim().min(12).max(2400) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to create a project.', 'UNAUTHENTICATED');
    if (!user.onboarding_complete) throw new HttpError(403, 'Complete your engineering profile before creating a project.', 'ONBOARDING_REQUIRED');
    await enforceRateLimit(user.id, 'project-generation', 8, 60 * 60);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Describe the problem or project you want to build (at least 12 characters).', 'INVALID_INPUT');

    const plan = await getPlanForUser(user.id);
    if (plan.active_projects_limit !== null) {
      const active = await query<{ count: number }>("SELECT COUNT(*)::int AS count FROM projects WHERE user_id=$1 AND status<>'archived'", [user.id]);
      if (Number(active.rows[0]?.count ?? 0) >= plan.active_projects_limit) {
        throw new HttpError(402, `Your ${plan.name} plan includes ${plan.active_projects_limit} active projects. Archive one or upgrade to create another.`, 'PROJECT_LIMIT_REACHED');
      }
    }
    if (isAiConfigured()) await assertAiUsageAvailable(user.id);
    const profileContext = [user.branch, user.current_year, user.skill_level, user.primary_goal, user.technologies].filter(Boolean).join(' | ');
    const generated = await generateProjectBlueprint(parsed.data.prompt, profileContext || 'Engineering learner', user.id);
    const projectId = randomUUID();
    const tasks = generated.blueprint.milestones.flatMap((milestone, milestoneIndex) => milestone.tasks.map((task, taskIndex) => ({
      title: task,
      description: milestone.description,
      phase: milestone.title,
      sortOrder: milestoneIndex * 20 + taskIndex,
    })));
    const generatedData = { ...generated.blueprint, generation_source: generated.source };
    await transaction(async (tx) => {
      await tx('INSERT INTO projects (id,user_id,title,prompt,description,status,difficulty,progress,generated_json,ai_generated) VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9)', [projectId, user.id, generated.blueprint.title, parsed.data.prompt, generated.blueprint.solution, 'planning', generated.blueprint.difficulty, JSON.stringify(generatedData), generated.source === 'ai']);
      for (const task of tasks) {
        await tx('INSERT INTO project_tasks (id,project_id,title,description,phase,sort_order) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), projectId, task.title, task.description, task.phase, task.sortOrder]);
      }
    });
    await recordAudit(user.id, 'project.created', 'project', projectId, { generation_source: generated.source }, requestIp(request));
    await recordEvent(user.id, 'project_created', { project_id: projectId, source: generated.source });
    const responseMessage = generated.source === 'ai'
      ? 'Your AI-generated engineering plan is ready.'
      : 'Your starter blueprint is ready. Add AI_API_KEY to enable tailored AI generation.';
    return NextResponse.json({ ok: true, projectId, source: generated.source, message: responseMessage }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
