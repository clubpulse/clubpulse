// GET /api/community/sessions?scope=…&kind=nets|pickup → sessions you may see
// POST /api/community/sessions { sessionId, join } → join or leave

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen } from '@/lib/community/service';
import { isScope } from '@/lib/community/rules';
import { joinSession, listSessions } from '@/lib/community/sessions';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const scope = req.nextUrl.searchParams.get('scope');
  const kind = req.nextUrl.searchParams.get('kind');
  const r = await listSessions(user.id, isScope(scope) ? scope : 'miles', kind === 'nets' || kind === 'pickup' ? kind : null);
  return r.success ? NextResponse.json({ sessions: r.data }) : fail(r.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { sessionId?: unknown; join?: unknown } | null;
  const r = await joinSession(user.id, body?.sessionId, body?.join !== false);
  return r.success ? NextResponse.json(r.data) : fail(r.error);
}
