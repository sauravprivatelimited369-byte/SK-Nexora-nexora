import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, HttpError } from '@/lib/api';
import { getMonthlyUsage, getPlanForUser, isAiConfigured } from '@/lib/ai';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Sign in to view usage.', 'UNAUTHENTICATED');
    const [plan, used] = await Promise.all([getPlanForUser(user.id), getMonthlyUsage(user.id)]);
    return NextResponse.json({ plan: plan.name, planId: plan.id, used, limit: plan.ai_request_limit, remaining: Math.max(0, plan.ai_request_limit - used), aiConfigured: isAiConfigured(), resetsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}
