// GET /api/community/profile?id=<user> → a profile (your own when id is left out)
// PUT /api/community/profile { headline, about, lookingFor, openToClub } → save your own

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen, saveProfile } from '@/lib/community/service';
import { getProfileGuarded } from '@/lib/community/social';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const result = await getProfileGuarded(user.id, req.nextUrl.searchParams.get('id') ?? user.id);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}

export async function PUT(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const result = await saveProfile(user.id, await readJson(req));
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
