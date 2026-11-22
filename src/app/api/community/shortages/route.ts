// GET  /api/community/shortages?scope=…&within=5|10|25 → clubs short of players, adults only
// POST /api/community/shortages { shortageId, reply } → "I can play" (or take it back)

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen } from '@/lib/community/service';
import { isScope } from '@/lib/community/rules';
import { filtersFrom } from '@/lib/community/filters';
import { listShortages, replyToShortage } from '@/lib/community/shortages';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const scope = req.nextUrl.searchParams.get('scope');
  const r = await listShortages(user.id, isScope(scope) ? scope : 'miles', filtersFrom((k) => req.nextUrl.searchParams.get(k)).within);
  return r.success ? NextResponse.json(r.data) : fail(r.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { shortageId?: unknown; reply?: unknown } | null;
  const r = await replyToShortage(user.id, body?.shortageId, body?.reply !== false);
  return r.success ? NextResponse.json(r.data) : fail(r.error);
}
