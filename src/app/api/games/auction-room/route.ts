// GET  /api/games/auction-room → today's status for the caller (prizes, starts left, result if played)
// POST /api/games/auction-room  { engine } → start today's Scores game; returns the seed the app builds it from

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getAuctionRoomStatus, startAuctionRoom } from '@/lib/mobile/auction-room';
import { ENGINE_VERSION } from '@/lib/games/auction-engine';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  // The app compares this with its own copy of the game before offering the daily auction
  return NextResponse.json({ ...(await getAuctionRoomStatus(user.id)), engine: ENGINE_VERSION });
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  // The app plays the auction with its own copy of the game and the server checks the result with
  // this one. If they differ (an older app after the player pool changed), the check would fail
  // at the end of an honest game, so the game is not started at all.
  const body = (await readJson(req)) as { engine?: unknown } | null;
  if (body?.engine !== ENGINE_VERSION) {
    return fail("Update the ClubPulse app to play today's auction. Practice still works.", 409);
  }
  const started = await startAuctionRoom(user.id);
  if (!started.ok) return fail(started.error, started.status);
  return NextResponse.json({ seed: started.seed, startsLeft: started.startsLeft });
}
