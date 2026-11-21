// POST /api/community/follow { subject: 'player'|'club', subjectId, on }  → follow or unfollow

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen } from '@/lib/community/service';
import { setFollow } from '@/lib/community/social';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { subject?: unknown; subjectId?: unknown; on?: unknown } | null;
  const r = await setFollow(user.id, body?.subject, body?.subjectId, body?.on !== false);
  return r.success ? NextResponse.json(r.data) : fail(r.error);
}
