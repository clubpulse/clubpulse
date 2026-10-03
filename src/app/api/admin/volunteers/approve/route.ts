// POST /api/admin/volunteers/approve  { sessionId } → { scoresAwarded }
// Sets club_confirmed = true; awards Scores only if gps_confirmed is also true. Pays once.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { approveVolunteerSession } from '@/lib/volunteer/approve';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { sessionId?: unknown } | null;
  if (typeof body?.sessionId !== 'string') return fail('sessionId is required', 400);

  const result = await approveVolunteerSession(user.id, body.sessionId);
  if (!result.success) return fail(result.error);
  return NextResponse.json(result.data);
}
