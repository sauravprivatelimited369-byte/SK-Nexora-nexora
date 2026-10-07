import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordAudit, recordEvent } from '@/lib/api';
import { query } from '@/lib/db';

const entry = z.object({ role: z.string().trim().max(120).default(''), organization: z.string().trim().max(120).default(''), dates: z.string().trim().max(80).default(''), details: z.string().trim().max(600).default('') });
const schema = z.object({
  headline: z.string().trim().max(160),
  summary: z.string().trim().max(1000),
  education: z.array(entry).max(6),
  experience: z.array(entry).max(8),
  certifications: z.array(z.object({ name: z.string().trim().max(120), issuer: z.string().trim().max(120), date: z.string().trim().max(80) })).max(12),
  links: z.object({ github: z.string().trim().max(220), linkedin: z.string().trim().max(220), website: z.string().trim().max(220) }),
  template: z.enum(['ats', 'modern']).default('ats'),
});

function validLinks(values: { github: string; linkedin: string; website: string }) {
  for (const value of Object.values(values)) {
    if (!value) continue;
    try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) return false; }
    catch { return false; }
  }
  return true;
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to save your resume.', 'UNAUTHENTICATED');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Check resume fields and keep each section within the listed limits.', 'INVALID_INPUT');
    if (!validLinks(parsed.data.links)) throw new HttpError(400, 'Links must use a valid https:// or http:// URL.', 'INVALID_LINK');
    const existing = await query<{ id: string }>('SELECT id FROM resumes WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1', [user.id]);
    const content = JSON.stringify(parsed.data);
    if (existing.rows[0]) await query('UPDATE resumes SET template=$1,content=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4', [parsed.data.template, content, existing.rows[0].id, user.id]);
    else await query('INSERT INTO resumes (id,user_id,title,template,content) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), user.id, 'My engineering resume', parsed.data.template, content]);
    await recordAudit(user.id, 'resume.saved', 'resume', existing.rows[0]?.id);
    await recordEvent(user.id, 'resume_saved', { template: parsed.data.template });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
