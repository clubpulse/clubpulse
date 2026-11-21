// GET  /api/community/feed?scope=club|miles|league|county|all → the feed
// POST /api/community/feed { body }                           → post, after the safety check

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen, createPost, getFeed } from '@/lib/community/service';
import { isScope } from '@/lib/community/rules';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const scope = req.nextUrl.searchParams.get('scope');
  const result = await getFeed(user.id, isScope(scope) ? scope : 'club');
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { body?: unknown } | null;
  const result = await createPost(user.id, body?.body);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
