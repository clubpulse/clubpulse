// POST /api/games/manager/play { xi: number[], plan } → plays today's match with that team

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getManager, playManagerMatch } from '@/lib/mobile/manager';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const res = await playManagerMatch(user.id, await readJson(req));
  if (!res.ok) return fail(res.error, res.status);
  return NextResponse.json({ result: res, status: await getManager(user.id) });
}
