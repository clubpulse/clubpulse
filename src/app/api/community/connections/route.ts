// GET  /api/community/connections                    → your connections and requests
// POST /api/community/connections { userId, yes }    → say yes or "not now" to someone

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { answerPerson, communityOpen, getConnections } from '@/lib/community/service';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const result = await getConnections(user.id);
  return result.success ? NextResponse.json({ connections: result.data }) : fail(result.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { userId?: unknown; yes?: unknown } | null;
  if (typeof body?.userId !== 'string') return fail('Person not found.', 400);
  const result = await answerPerson(user.id, body.userId, body.yes === true);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
