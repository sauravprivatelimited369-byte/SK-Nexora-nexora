import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, errorResponse, HttpError, recordAudit, recordEvent } from '@/lib/api';
import { query, transaction } from '@/lib/db';

const branches = ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil', 'Chemical', 'AI/ML', 'Data Science', 'Other'] as const;
const years = ['1st year', '2nd year', '3rd year', '4th year', 'Graduate', 'Early Career'] as const;
const goals = ['Learn', 'Build projects', 'Get internship', 'Get placement', 'Improve coding', 'Prepare for interviews', 'Build startup', 'Research'] as const;
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  branch: z.enum(branches),
  currentYear: z.enum(years),
  skillLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  primaryGoal: z.enum(goals),
  technologies: z.array(z.string().trim().min(1).max(40)).max(12),
  weeklyHours: z.enum(['2–5 hours', '5–10 hours', '10–20 hours', '20+ hours']),
});

function branchMatcher(branch: string): string[] {
  if (branch === 'AI/ML' || branch === 'Data Science') return ['AI/ML & Data Science'];
  if (branch === 'Other') return [];
  return [branch];
}

function usernameSlug(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 22) || 'engineer';
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to complete your profile.', 'UNAUTHENTICATED');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Complete each profile step with a valid choice.', 'INVALID_INPUT');
    const values = parsed.data;
    const branchOptions = branchMatcher(values.branch);
    const topics = branchOptions.length
      ? await query<{ id: string; title: string; summary: string; sort_order: number }>(
        `SELECT t.id,t.title,t.summary,t.sort_order FROM topics t JOIN subjects s ON s.id=t.subject_id
         WHERE s.branch=$1 ORDER BY t.sort_order,t.title LIMIT 18`,
        [branchOptions[0]],
      )
      : await query<{ id: string; title: string; summary: string; sort_order: number }>('SELECT id,title,summary,sort_order FROM topics ORDER BY sort_order,title LIMIT 12');

    const existingProfile = await query<{ username: string | null }>('SELECT username FROM profiles WHERE user_id=$1', [user.id]);
    let username = existingProfile.rows[0]?.username;
    if (!username) {
      const base = usernameSlug(values.name);
      username = `${base}-${randomUUID().slice(0, 4)}`;
    }
    const pathId = randomUUID();
    const goalLabel = values.primaryGoal === 'Get internship' ? 'Become internship-ready' : values.primaryGoal === 'Get placement' ? 'Prepare for placement' : values.primaryGoal === 'Build projects' ? 'Build portfolio-ready projects' : `${values.primaryGoal} in ${values.branch}`;
    const estimatedWeeks = values.weeklyHours === '2–5 hours' ? 12 : values.weeklyHours === '5–10 hours' ? 10 : values.weeklyHours === '10–20 hours' ? 8 : 6;
    const skillBaseline = values.skillLevel === 'Beginner' ? 18 : values.skillLevel === 'Intermediate' ? 38 : 58;

    await transaction(async (tx) => {
      await tx('UPDATE users SET name=$1,updated_at=NOW() WHERE id=$2', [values.name, user.id]);
      await tx(
        `INSERT INTO profiles (user_id,branch,current_year,skill_level,primary_goal,technologies,weekly_hours,username,onboarding_complete,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW())
         ON CONFLICT (user_id) DO UPDATE SET branch=EXCLUDED.branch,current_year=EXCLUDED.current_year,
          skill_level=EXCLUDED.skill_level,primary_goal=EXCLUDED.primary_goal,technologies=EXCLUDED.technologies,
          weekly_hours=EXCLUDED.weekly_hours,username=COALESCE(profiles.username,EXCLUDED.username),onboarding_complete=TRUE,updated_at=NOW()`,
        [user.id, values.branch, values.currentYear, values.skillLevel, values.primaryGoal, JSON.stringify(values.technologies), values.weeklyHours, username],
      );
      const paths = await tx('SELECT id FROM learning_paths WHERE user_id=$1', [user.id]);
      if (!paths.rowCount) {
        await tx('INSERT INTO learning_paths (id,user_id,title,goal,estimated_weeks,source) VALUES ($1,$2,$3,$4,$5,$6)', [pathId, user.id, `${values.branch} foundations`, `${goalLabel} • ${values.skillLevel} • ${values.weeklyHours}/week`, estimatedWeeks, 'curated personalized sequence']);
        for (let index = 0; index < topics.rows.length; index += 1) {
          const topic = topics.rows[index];
          await tx('INSERT INTO learning_path_items (id,path_id,topic_id,title,description,sort_order) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), pathId, topic.id, topic.title, topic.summary, index]);
        }
      }
      for (const technology of values.technologies) {
        const skillId = `skill-${technology.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}`;
        await tx('INSERT INTO skills (id,name,category,description) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING', [skillId, technology, 'Self-reported technology', 'Technology selected by the learner during onboarding.']);
        const skill = await tx<{ id: string }>('SELECT id FROM skills WHERE LOWER(name)=LOWER($1)', [technology]);
        if (skill.rows[0]) {
          await tx('INSERT INTO user_skills (id,user_id,skill_id,mastery,self_reported) VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT (user_id,skill_id) DO NOTHING', [randomUUID(), user.id, skill.rows[0].id, skillBaseline]);
          const previous = await tx('SELECT id FROM skill_evidence WHERE user_id=$1 AND skill_id=$2 AND source_type=$3', [user.id, skill.rows[0].id, 'self_reported']);
          if (!previous.rowCount) await tx('INSERT INTO skill_evidence (id,user_id,skill_id,source_type,evidence,confidence) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), user.id, skill.rows[0].id, 'self_reported', 'Selected by the learner in their engineering profile; not independently assessed.', 25]);
        }
      }
    });
    await recordAudit(user.id, 'onboarding.completed', 'profile', user.id, { branch: values.branch });
    await recordEvent(user.id, 'onboarding_completed', { branch: values.branch, primary_goal: values.primaryGoal });
    return NextResponse.json({ ok: true, username });
  } catch (error) {
    return errorResponse(error);
  }
}
