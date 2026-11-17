// GET  /api/games/auction-room → today's status for the caller (prizes, starts left, result if played)
// POST /api/games/auction-room → start today's Scores game; returns the seed the app builds it from

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getAuctionRoomStatus, startAuctionRoom } from '@/lib/mobile/auction-room';
import { fail, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getAuctionRoomStatus(user.id));
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const started = await startAuctionRoom(user.id);
  if (!started.ok) return fail(started.error, started.status);
  return NextResponse.json({ seed: started.seed, startsLeft: started.startsLeft });
}
