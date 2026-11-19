// GET /api/home → what the phone app's Home screen shows: next match, streak, league place,
// scratch card progress, latest coaching findings and recent Scores.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getHomeForUser } from '@/lib/mobile/home';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getHomeForUser(user.id));
}
