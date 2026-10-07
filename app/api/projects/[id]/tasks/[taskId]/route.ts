import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordEvent } from '@/lib/api';
import { query, transaction } from '@/lib/db';

export async function PATCH(request: Request, context: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to update project tasks.', 'UNAUTHENTICATED');
    const { id: projectId, taskId } = await context.params;
    let completed: unknown;
    try { completed = (await request.json()).completed; } catch { throw new HttpError(400, 'Choose whether this task is complete.', 'INVALID_INPUT'); }
    if (typeof completed !== 'boolean') throw new HttpError(400, 'Task completion must be true or false.', 'INVALID_INPUT');

    const updated = await transaction(async (tx) => {
      const task = await tx<{ id: string }>(
        `UPDATE project_tasks SET completed=$1,completed_at=CASE WHEN $1 THEN NOW() ELSE NULL END
         WHERE id=$2 AND project_id=$3 AND EXISTS (SELECT 1 FROM projects WHERE id=$3 AND user_id=$4)
         RETURNING id`,
        [completed, taskId, projectId, user.id],
      );
      if (!task.rowCount) return null;
      const counts = await tx<{ total: number; done: number }>('SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE completed=TRUE)::int AS done FROM project_tasks WHERE project_id=$1', [projectId]);
      const total = Number(counts.rows[0]?.total ?? 0);
      const done = Number(counts.rows[0]?.done ?? 0);
      const progress = total ? Math.round(done / total * 100) : 0;
      const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'planning';
      await tx('UPDATE projects SET progress=$1,status=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4', [progress, status, projectId, user.id]);
      return { progress, status, total, done };
    });
    if (!updated) throw new HttpError(404, 'Project task not found.', 'NOT_FOUND');
    await recordEvent(user.id, completed ? 'project_task_completed' : 'project_task_reopened', { project_id: projectId, task_id: taskId, progress: updated.progress });
    return NextResponse.json({ ok: true, ...updated });
  } catch (error) {
    return errorResponse(error);
  }
}
