import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordAudit, recordEvent } from '@/lib/api';
import { query } from '@/lib/db';

const schema = z.object({
  filename: z.string().trim().min(1).max(120).regex(/^[\w .()\-]+$/),
  content: z.string().trim().min(30).max(100_000),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to save project evidence.', 'UNAUTHENTICATED');
    const { id: projectId } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Add a file name and at least 30 characters of code, a README, test notes, or implementation evidence.', 'INVALID_INPUT');
    const project = await query<{ id: string }>('SELECT id FROM projects WHERE id=$1 AND user_id=$2', [projectId, user.id]);
    if (!project.rowCount) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
    const size = Buffer.byteLength(parsed.data.content, 'utf8');
    const previous = await query<{ total: number; count: number }>('SELECT COALESCE(SUM(LENGTH(content)),0)::int AS total,COUNT(*)::int AS count FROM project_files WHERE project_id=$1 AND user_id=$2', [projectId, user.id]);
    if (Number(previous.rows[0]?.count ?? 0) >= 8 || Number(previous.rows[0]?.total ?? 0) + size > 200_000) {
      throw new HttpError(413, 'This project supports up to 8 evidence files and 200 KB of text. Remove or shorten evidence before adding more.', 'EVIDENCE_LIMIT');
    }
    const id = randomUUID();
    const type = parsed.data.filename.endsWith('.md') ? 'text/markdown' : parsed.data.filename.endsWith('.json') ? 'application/json' : 'text/plain';
    await query('INSERT INTO project_files (id,project_id,user_id,filename,content,content_type) VALUES ($1,$2,$3,$4,$5,$6)', [id, projectId, user.id, parsed.data.filename, parsed.data.content, type]);
    await query('UPDATE projects SET analysis_json=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2', [projectId, user.id]);
    await recordAudit(user.id, 'project.evidence_added', 'project_file', id, { project_id: projectId });
    await recordEvent(user.id, 'project_evidence_added', { project_id: projectId });
    return NextResponse.json({ ok: true, id, filename: parsed.data.filename }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
