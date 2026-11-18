// GET  /api/clubs/join → { state: 'none' | 'pending', clubName? }   is a join request waiting?
// POST /api/clubs/join  Body: { code } → { state: 'pending' | 'member', clubName }

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getJoinState, requestToJoin } from '@/lib/mobile/club-admin';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getJoinState(user.id));
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const body = (await readJson(req)) as { code?: unknown } | null;
  const result = await requestToJoin(user.id, body?.code);
  if (!result.success) return fail(result.error, 400);
  return NextResponse.json(result.data);
}
