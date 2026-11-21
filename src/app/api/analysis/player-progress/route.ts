// GET /api/analysis/player-progress              → { players }   the players this coach works with
// GET /api/analysis/player-progress?player=<id>  → { name, progress }   one player's progress
// For coaches: a player's analyses open only when there is a confirmed or completed booking.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getCoachPlayers, getPlayerProgress } from '@/lib/analysis/progress';
import { fail, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const player = req.nextUrl.searchParams.get('player');
  if (!player) return NextResponse.json({ players: await getCoachPlayers(user.id) });

  const result = await getPlayerProgress(user.id, player);
  return result.success ? NextResponse.json(result.data) : fail(result.error, 403);
}
