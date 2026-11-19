// GET  /api/games/knowledge?game=umpire|whoami|scorecard → today's round, or the result if played
// POST /api/games/knowledge { game, answers }            → marks the round and pays any Scores

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { isKnowledgeGame } from '@/lib/games/knowledge';
import { getKnowledge, submitKnowledge } from '@/lib/mobile/knowledge';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const game = req.nextUrl.searchParams.get('game');
  if (!isKnowledgeGame(game)) return fail('Unknown game.', 404);
  return NextResponse.json(await getKnowledge(user.id, game));
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const body = ((await readJson(req)) ?? {}) as { game?: unknown; answers?: unknown };
  if (!isKnowledgeGame(body.game)) return fail('Unknown game.', 404);
  const res = await submitKnowledge(user.id, body.game, body.answers);
  if (!res.ok) return fail(res.error, res.status);
  return NextResponse.json(res);
}
