// POST  /api/ai/insights  { match_id }      → generate Tier 1 coaching insights (club admins of that match)
// GET   /api/ai/insights?player_id=<uuid>   → that player's last 20 insights (own, or as their club admin)
// PATCH /api/ai/insights  { id }            → mark one of your insights as acknowledged
// Auth: Bearer access token (Expo) or cookie session (web). Anthropic is only ever called server-side.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isClubAdmin } from '@/lib/auth/admin';
import { generateCoachingInsights } from '@/lib/ai/coaching-insights';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

// Generation calls the model once per player
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidField(body: unknown, key: string): string | null {
  const value = body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : null;
  return typeof value === 'string' && UUID.test(value) ? value : null;
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const matchId = uuidField(await readJson(req), 'match_id');
  if (!matchId) return fail('match_id must be a UUID');

  const { data: match } = await createAdminClient().from('match_scorecards').select('club_id').eq('id', matchId).maybeSingle();
  if (!match) return fail('Match not found');
  if (!(await isClubAdmin(user.id, match.club_id))) return fail('Forbidden: only club admins can generate insights');

  try {
    return NextResponse.json(await generateCoachingInsights(matchId));
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Insight generation failed', 500);
  }
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const playerId = req.nextUrl.searchParams.get('player_id') ?? user.id;
  if (!UUID.test(playerId)) return fail('player_id must be a UUID');

  // RLS limits this to the caller's own insights, or their club's as a club admin
  const { data, error } = await supabase
    .from('coaching_insights')
    .select('id, player_id, match_id, generated_at, tier, insight_type, finding, recommendation, acknowledged')
    .eq('player_id', playerId)
    .order('generated_at', { ascending: false })
    .limit(20);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ insights: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const id = uuidField(await readJson(req), 'id');
  if (!id) return fail('id must be a UUID');

  // Players can only update `acknowledged`, and only on their own rows (column grant + RLS)
  const { data, error } = await supabase
    .from('coaching_insights')
    .update({ acknowledged: true })
    .eq('id', id)
    .eq('player_id', user.id)
    .select('id, acknowledged')
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Insight not found');
  return NextResponse.json({ insight: data });
}
