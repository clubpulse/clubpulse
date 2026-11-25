import { rateLimitResponse } from '@/lib/ai/rate-limit';
// POST /api/ai/companion  { message, conversationId? } → { reply, conversationId }
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { chatWithCompanion } from '@/lib/ai/companion';
import { logActivity } from '@/lib/mobile/rewards';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { getPaidAccess } from '@/lib/billing/access';
import { PAID_FEATURE_MESSAGE } from '@/lib/billing/access-logic';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const limited = rateLimitResponse(user.id, 'companion');
  if (limited) return limited;
  if (!(await getPaidAccess(user.id, user.email)).allowed) return fail(PAID_FEATURE_MESSAGE, 402);

  const body = (await readJson(req)) as { message?: unknown; conversationId?: unknown } | null;
  if (typeof body?.message !== 'string') return fail('message is required', 400);
  if (body.conversationId !== undefined && body.conversationId !== null && typeof body.conversationId !== 'string') {
    return fail('conversationId must be a string', 400);
  }

  const result = await chatWithCompanion(user.id, body.message, (body.conversationId as string | null | undefined) ?? undefined);
  if (!result.success) return fail(result.error, result.status);
  // Counts toward the daily "Ask Coach AI" task
  await logActivity(user.id, 'coach_ai');
  return NextResponse.json(result.data);
}
