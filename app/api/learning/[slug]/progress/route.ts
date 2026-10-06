import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordEvent } from '@/lib/api';
import { query } from '@/lib/db';

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to save learning progress.', 'UNAUTHENTICATED');
    const parsed = z.object({ completed: z.boolean() }).safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Progress could not be validated.', 'INVALID_INPUT');
    const { slug } = await context.params;
    const topic = await query<{ id: string; title: string }>('SELECT id,title FROM topics WHERE slug=$1', [slug]);
    if (!topic.rows[0]) throw new HttpError(404, 'Learning topic not found.', 'NOT_FOUND');
    const completed = parsed.data.completed;
    await query(
      `INSERT INTO user_progress (id,user_id,topic_id,status,completion_percent,completed_at)
       VALUES ($1,$2,$3,$4,$5,CASE WHEN $4='completed' THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id,topic_id) DO UPDATE SET status=EXCLUDED.status,
        completion_percent=CASE WHEN EXCLUDED.status='completed' THEN 100 ELSE GREATEST(user_progress.completion_percent,10) END,
        completed_at=CASE WHEN EXCLUDED.status='completed' THEN NOW() ELSE NULL END`,
      [randomUUID(), user.id, topic.rows[0].id, completed ? 'completed' : 'in_progress', completed ? 100 : 10],
    );
    await recordEvent(user.id, completed ? 'topic_completed' : 'topic_started', { topic_id: topic.rows[0].id, slug });
    return NextResponse.json({ ok: true, completed });
  } catch (error) {
    return errorResponse(error);
  }
}
