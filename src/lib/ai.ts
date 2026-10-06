import 'server-only';
import { randomUUID } from 'node:crypto';
import { query } from './db';
import { HttpError } from './api';

export class AIUnavailableError extends Error {
  constructor(message = 'AI is not configured yet. Add a server-side AI_API_KEY to enable generative features.') {
    super(message);
    this.name = 'AIUnavailableError';
  }
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ChatResult = { text: string; promptTokens: number | null; completionTokens: number | null };

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY?.trim());
}

export async function getPlanForUser(userId: string): Promise<{ id: string; name: string; ai_request_limit: number; active_projects_limit: number | null }> {
  const result = await query<{ id: string; name: string; ai_request_limit: number; active_projects_limit: number | null }>(
    `SELECT p.id,p.name,p.ai_request_limit,p.active_projects_limit
     FROM subscriptions s JOIN plans p ON p.id=s.plan_id
     WHERE s.user_id=$1 AND s.status IN ('active','trialing')
       AND (s.current_period_end IS NULL OR s.current_period_end>NOW())
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId],
  );
  if (result.rows[0]) return result.rows[0];
  const free = await query<{ id: string; name: string; ai_request_limit: number; active_projects_limit: number | null }>('SELECT id,name,ai_request_limit,active_projects_limit FROM plans WHERE id=$1', ['free']);
  return free.rows[0] ?? { id: 'free', name: 'Free', ai_request_limit: 25, active_projects_limit: 3 };
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const result = await query<{ total: number }>("SELECT COALESCE(SUM(units),0)::int AS total FROM usage_records WHERE user_id=$1 AND kind='ai_request' AND created_at >= date_trunc('month', NOW())", [userId]);
  return Number(result.rows[0]?.total ?? 0);
}

export async function assertAiUsageAvailable(userId: string): Promise<{ used: number; limit: number; plan: string }> {
  if (!isAiConfigured()) throw new AIUnavailableError();
  const plan = await getPlanForUser(userId);
  const used = await getMonthlyUsage(userId);
  if (used >= plan.ai_request_limit) throw new HttpError(402, `You’ve used this month’s ${plan.ai_request_limit} AI requests on ${plan.name}. Upgrade your plan to continue.`, 'AI_LIMIT_REACHED');
  return { used, limit: plan.ai_request_limit, plan: plan.name };
}

export async function chatCompletion(messages: ChatMessage[], options: { temperature?: number; maxTokens?: number; userId?: string; kind?: string } = {}): Promise<ChatResult> {
  if (!isAiConfigured()) throw new AIUnavailableError();
  const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2200,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new HttpError(504, 'The AI request timed out. Please retry with a shorter prompt.', 'AI_TIMEOUT');
    throw new HttpError(502, 'The AI service could not be reached. Please retry in a moment.', 'AI_NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('[nexora] AI provider returned an error', response.status, body.slice(0, 500));
    if (response.status === 429) throw new HttpError(429, 'The AI provider is busy or has reached its limit. Please try again later.', 'AI_PROVIDER_RATE_LIMIT');
    throw new HttpError(502, 'The AI provider could not complete this request. Please try again.', 'AI_PROVIDER_ERROR');
  }
  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new HttpError(502, 'The AI provider returned an empty response. Please retry.', 'AI_EMPTY_RESPONSE');
  const promptTokens = data.usage?.prompt_tokens ?? null;
  const completionTokens = data.usage?.completion_tokens ?? null;
  if (options.userId) {
    await query('INSERT INTO usage_records (id,user_id,kind,units,tokens,metadata) VALUES ($1,$2,$3,1,$4,$5)', [randomUUID(), options.userId, 'ai_request', promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null, JSON.stringify({ feature: options.kind || 'assistant', model: process.env.AI_MODEL || 'gpt-4o-mini' })]);
  }
  return { text, promptTokens, completionTokens };
}

export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new HttpError(502, 'The AI returned an incomplete structured plan. Please regenerate.', 'AI_INVALID_JSON');
  try { return JSON.parse(cleaned.slice(start, end + 1)) as T; }
  catch { throw new HttpError(502, 'The AI returned a plan that could not be read. Please regenerate.', 'AI_INVALID_JSON'); }
}
