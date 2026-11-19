// GET  /api/games/manager → the current season: squad, next opponent, results and table
// POST /api/games/manager → starts a new season

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getManager, startManager } from '@/lib/mobile/manager';
import { fail, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getManager(user.id));
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const res = await startManager(user.id);
  if (!res.ok) return fail(res.error, res.status);
  return NextResponse.json(await getManager(user.id));
}
