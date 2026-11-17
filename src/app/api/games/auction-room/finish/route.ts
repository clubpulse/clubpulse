// POST /api/games/auction-room/finish  { results: [{ winner, price } × 20] }
// Checks the finished game against the seed it was started from and pays Scores for the place.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { finishAuctionRoom, parseResults } from '@/lib/mobile/auction-room';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const results = parseResults(await readJson(req));
  if (!results) return fail('Send one result for each of the 20 lots.', 400);

  const finished = await finishAuctionRoom(user.id, results);
  if (!finished.ok) return fail(finished.error, finished.status);
  return NextResponse.json({
    place: finished.place,
    score: finished.score,
    amount: finished.amount,
    capped: finished.capped,
  });
}
