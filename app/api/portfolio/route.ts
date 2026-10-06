import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordAudit, recordEvent, requestIp } from '@/lib/api';
import { query, transaction } from '@/lib/db';

const schema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9][a-z0-9-]+[a-z0-9]$/, 'Use 3–30 letters, numbers, or hyphens.'),
  headline: z.string().trim().max(140),
  about: z.string().trim().max(1000),
  isPublic: z.boolean(),
  showEmail: z.boolean(),
  showResume: z.boolean(),
  publicProjectIds: z.array(z.string().uuid()).max(20),
});

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to manage your portfolio.', 'UNAUTHENTICATED');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Check the portfolio fields.', 'INVALID_INPUT');
    const value = parsed.data;
    const conflict = await query<{ user_id: string }>('SELECT user_id FROM profiles WHERE username=$1 AND user_id<>$2', [value.username, user.id]);
    if (conflict.rowCount) throw new HttpError(409, 'That portfolio username is already in use.', 'USERNAME_TAKEN');
    if (value.publicProjectIds.length) {
      for (const projectId of value.publicProjectIds) {
        const owned = await query('SELECT id FROM projects WHERE user_id=$1 AND id=$2', [user.id, projectId]);
        if (!owned.rowCount) throw new HttpError(400, 'One or more selected projects are not available to publish.', 'INVALID_PROJECT_SELECTION');
      }
    }
    const existing = await query<{ id: string }>('SELECT id FROM portfolios WHERE user_id=$1', [user.id]);
    const portfolioId = existing.rows[0]?.id || randomUUID();
    await transaction(async (tx) => {
      await tx('UPDATE profiles SET username=$1,portfolio_public=$2,updated_at=NOW() WHERE user_id=$3', [value.username, value.isPublic, user.id]);
      if (existing.rows[0]) {
        await tx('UPDATE portfolios SET username=$1,headline=$2,about=$3,is_public=$4,show_email=$5,show_resume=$6,updated_at=NOW() WHERE user_id=$7', [value.username, value.headline, value.about, value.isPublic, value.showEmail, value.showResume, user.id]);
      } else {
        await tx('INSERT INTO portfolios (id,user_id,username,headline,about,is_public,show_email,show_resume) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [portfolioId, user.id, value.username, value.headline, value.about, value.isPublic, value.showEmail, value.showResume]);
      }
      await tx('UPDATE projects SET visibility=$1,updated_at=NOW() WHERE user_id=$2', ['private', user.id]);
      for (const projectId of value.publicProjectIds) await tx('UPDATE projects SET visibility=$1,updated_at=NOW() WHERE id=$2 AND user_id=$3', ['public', projectId, user.id]);
    });
    await recordAudit(user.id, 'portfolio.settings_updated', 'portfolio', portfolioId, { is_public: value.isPublic, public_project_count: value.publicProjectIds.length }, requestIp(request));
    await recordEvent(user.id, 'portfolio_settings_updated', { is_public: value.isPublic, public_project_count: value.publicProjectIds.length });
    return NextResponse.json({ ok: true, username: value.username, isPublic: value.isPublic });
  } catch (error) {
    return errorResponse(error);
  }
}
