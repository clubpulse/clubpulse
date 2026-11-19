// POST /api/home/availability { fixtureId, status } → saves whether the caller can play

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { setAvailabilityForUser } from '@/lib/mobile/home';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const body = ((await readJson(req)) ?? {}) as { fixtureId?: unknown; status?: unknown };
  const res = await setAvailabilityForUser(user.id, body.fixtureId, body.status);
  if (!res.success) return fail(res.error, /not found/i.test(res.error) ? 404 : 400);
  return NextResponse.json(res.data);
}
