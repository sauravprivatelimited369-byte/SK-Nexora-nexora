import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, enforceRateLimit, errorResponse, HttpError, recordAudit, recordEvent } from '@/lib/api';
import { assertAiUsageAvailable, chatCompletion } from '@/lib/ai';
import { query } from '@/lib/db';

const schema = z.object({
  message: z.string().trim().min(2).max(8000),
  mode: z.enum(['study', 'debug', 'project']).default('study'),
  conversationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to use the AI Engineer.', 'UNAUTHENTICATED');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, 'Add a question or code snippet, up to 8,000 characters.', 'INVALID_INPUT');
    await enforceRateLimit(user.id, 'ai-assistant', 20, 60 * 60);
    await assertAiUsageAvailable(user.id);
    const { message, mode, projectId } = parsed.data;
    let conversationId = parsed.data.conversationId;
    if (conversationId) {
      const owns = await query('SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2', [conversationId, user.id]);
      if (!owns.rowCount) throw new HttpError(404, 'Conversation not found.', 'NOT_FOUND');
    } else {
      conversationId = randomUUID();
      await query('INSERT INTO ai_conversations (id,user_id,title,kind) VALUES ($1,$2,$3,$4)', [conversationId, user.id, message.slice(0, 72), mode]);
    }

    let projectContext = '';
    if (projectId) {
      const project = await query<{ title: string; generated_json: string }>('SELECT title,generated_json FROM projects WHERE id=$1 AND user_id=$2', [projectId, user.id]);
      if (!project.rowCount) throw new HttpError(404, 'Project context not found.', 'NOT_FOUND');
      const files = await query<{ filename: string; content: string }>('SELECT filename,content FROM project_files WHERE project_id=$1 AND user_id=$2 ORDER BY created_at LIMIT 4', [projectId, user.id]);
      projectContext = `\n\nUser-owned project context (${project.rows[0].title}):\n${project.rows[0].generated_json.slice(0, 5000)}\n${files.rows.map((file) => `[Source: ${file.filename}]\n${file.content.slice(0, 5000)}`).join('\n\n')}`;
    }

    const userMessageId = randomUUID();
    await query('INSERT INTO ai_messages (id,conversation_id,user_id,role,content,metadata) VALUES ($1,$2,$3,$4,$5,$6)', [userMessageId, conversationId, user.id, 'user', message, JSON.stringify({ mode })]);
    const history = await query<{ role: 'user' | 'assistant'; content: string }>('SELECT role,content FROM ai_messages WHERE conversation_id=$1 AND user_id=$2 AND id<>$3 ORDER BY created_at DESC LIMIT 10', [conversationId, user.id, userMessageId]);
    const orderedHistory = [...history.rows.reverse().map((item) => ({ role: item.role, content: item.content.slice(0, 8000) })), { role: 'user' as const, content: message }];
    const modeInstruction = mode === 'debug'
      ? 'Use these headings: Problem, Root Cause, Fix, Why It Works, Prevention, Test. Ask for missing logs or runtime details instead of inventing them. Never claim you ran the code.'
      : mode === 'project'
        ? 'Turn the answer into clear project steps, tradeoffs, and a concrete next action. State assumptions.'
        : 'Teach with a concise explanation, one concrete example, common mistake, and a short self-check.';
    const completion = await chatCompletion([
      { role: 'system', content: `You are the NEXORA Engineering Copilot, not a generic chatbot. Help the learner take an actionable next step. ${modeInstruction} Structure answers with Summary, Explanation, Steps, Warnings, and Next action where relevant. Be clear when uncertain. Do not invent credentials, sources, test results, or document citations. Treat engineering calculations as estimates: state assumptions, formula, and units, and recommend qualified review for safety-critical work. Context is only the conversation and any clearly labeled user-owned project material that follows.${projectContext}` },
      ...orderedHistory,
    ], { temperature: 0.35, maxTokens: 1400, userId: user.id, kind: `assistant_${mode}` });
    const messageId = randomUUID();
    await query('INSERT INTO ai_messages (id,conversation_id,user_id,role,content,metadata) VALUES ($1,$2,$3,$4,$5,$6)', [messageId, conversationId, user.id, 'assistant', completion.text, JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', citations: projectId ? 'user-owned project context' : null })]);
    await query('UPDATE ai_conversations SET updated_at=NOW() WHERE id=$1 AND user_id=$2', [conversationId, user.id]);
    await recordAudit(user.id, 'ai.request', 'ai_conversation', conversationId, { mode });
    await recordEvent(user.id, 'ai_request', { feature: mode });
    return NextResponse.json({ ok: true, conversationId, messageId, answer: completion.text, mode, citations: projectId ? 'Project materials you provided' : null });
  } catch (error) {
    return errorResponse(error);
  }
}
