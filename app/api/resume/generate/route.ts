import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordEvent } from '@/lib/api';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to create a resume.', 'UNAUTHENTICATED');
    const existing = await query<{ id: string; content: string }>('SELECT id,content FROM resumes WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1', [user.id]);
    if (existing.rows[0]) return NextResponse.json({ ok: true, alreadyExists: true, content: JSON.parse(existing.rows[0].content) });
    const content = { headline: '', summary: '', education: [], experience: [], certifications: [], links: { github: '', linkedin: '', website: '' } };
    await query('INSERT INTO resumes (id,user_id,title,template,content) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), user.id, 'My engineering resume', 'ats', JSON.stringify(content)]);
    await recordEvent(user.id, 'resume_generated', { source: 'actual_profile_and_evidence' });
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    return errorResponse(error);
  }
}
