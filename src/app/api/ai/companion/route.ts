// POST /api/ai/companion  { message, conversationId? } → { reply, conversationId }
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { chatWithCompanion } from '@/lib/ai/companion';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { message?: unknown; conversationId?: unknown } | null;
  if (typeof body?.message !== 'string') return fail('message is required', 400);
  if (body.conversationId !== undefined && body.conversationId !== null && typeof body.conversationId !== 'string') {
    return fail('conversationId must be a string', 400);
  }

  const result = await chatWithCompanion(user.id, body.message, (body.conversationId as string | null | undefined) ?? undefined);
  if (!result.success) return fail(result.error, result.status);
  return NextResponse.json(result.data);
}
