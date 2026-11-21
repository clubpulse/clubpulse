'use server';

import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCoachingInsights } from '@/lib/ai/coaching-insights';
import { summarise, nextBallPosition, commentaryFor, isLegal, type Delivery, type DeliveryInput, type InningsSide } from '@/lib/match-day/scoring';
import type { ActionResult } from '@/lib/types/action';
import type {
  MatchScorecard,
  MatchPlayerScore,
  MatchCommentary,
  ScorecardWithDetails,
  ScorecardStatus,
  EventType,
  InningsState,
} from '@/lib/types/match-day';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getTodaysMatch(clubId: string): Promise<ActionResult<MatchScorecard | null>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('match_scorecards')
    .select('*')
    .eq('club_id', clubId)
    .eq('match_date', today)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MatchScorecard | null };
}

export async function getRecentScorecards(clubId: string): Promise<ActionResult<MatchScorecard[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('match_scorecards')
    .select('*')
    .eq('club_id', clubId)
    .order('match_date', { ascending: false })
    .limit(10);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as MatchScorecard[] };
}

export async function getScorecardWithPlayers(id: string): Promise<ActionResult<ScorecardWithDetails>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const [scorecardRes, playersRes, commentaryRes, deliveriesRes] = await Promise.all([
    supabase.from('match_scorecards').select('*').eq('id', id).single(),
    supabase.from('match_player_scores').select('*').eq('scorecard_id', id).order('batting_position'),
    supabase
      .from('match_commentary')
      .select('*')
      .eq('scorecard_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('match_deliveries')
      .select('*')
      .eq('scorecard_id', id)
      .order('seq', { ascending: false })
      .limit(60),
  ]);

  if (scorecardRes.error) return { success: false, error: scorecardRes.error.message };

  return {
    success: true,
    data: {
      scorecard: scorecardRes.data as MatchScorecard,
      playerScores: (playersRes.data ?? []) as MatchPlayerScore[],
      commentary: (commentaryRes.data ?? []) as MatchCommentary[],
      // The table only exists once the ball-by-ball migration has been applied; before then this is empty.
      deliveries: (deliveriesRes.data ?? []) as Delivery[],
    },
  };
}

export async function adminCreateScorecard(data: {
  clubId: string;
  opposition: string;
  venue?: string;
  matchDate?: string;
}): Promise<ActionResult<MatchScorecard>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from('match_scorecards')
    .insert({
      club_id: data.clubId,
      opposition: data.opposition,
      venue: data.venue,
      match_date: data.matchDate ?? new Date().toISOString().split('T')[0],
      scorer_user_id: userId,
      status: 'setup',
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: inserted as MatchScorecard };
}

export async function adminUpdateInnings(
  id: string,
  innings: 'our_innings' | 'their_innings',
  data: Partial<InningsState>
): Promise<ActionResult<MatchScorecard>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  // Read existing innings to merge
  const { data: existing, error: fetchErr } = await supabase
    .from('match_scorecards')
    .select(innings)
    .eq('id', id)
    .single();

  if (fetchErr) return { success: false, error: fetchErr.message };

  const merged = { ...((existing as Record<string, unknown>)[innings] as InningsState), ...data };

  const { data: updated, error } = await supabase
    .from('match_scorecards')
    .update({ [innings]: merged, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: updated as MatchScorecard };
}

export async function adminUpdateScorecardStatus(
  id: string,
  status: ScorecardStatus
): Promise<ActionResult<MatchScorecard>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('match_scorecards')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MatchScorecard };
}

export async function adminUpsertPlayerScore(data: {
  scorecardId: string;
  userId: string;
  runs?: number;
  balls_faced?: number;
  fours?: number;
  sixes?: number;
  how_out?: string;
  batting_position?: number;
  overs_bowled?: number;
  runs_conceded?: number;
  wickets?: number;
  maidens?: number;
  catches?: number;
  run_outs?: number;
  stumpings?: number;
}): Promise<ActionResult<MatchPlayerScore>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { scorecardId, userId: targetUserId, ...rest } = data;

  const { data: upserted, error } = await supabase
    .from('match_player_scores')
    .upsert(
      { scorecard_id: scorecardId, user_id: targetUserId, ...rest },
      { onConflict: 'scorecard_id,user_id' }
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: upserted as MatchPlayerScore };
}

export async function adminAddCommentary(
  scorecardId: string,
  message: string,
  eventType: EventType = 'update'
): Promise<ActionResult<MatchCommentary>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('match_commentary')
    .insert({ scorecard_id: scorecardId, message, event_type: eventType })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MatchCommentary };
}

export async function adminCompleteMatch(
  id: string,
  result: string
): Promise<ActionResult<MatchScorecard>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('match_scorecards')
    .update({ status: 'completed', result, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Add a result commentary entry
  await supabase.from('match_commentary').insert({
    scorecard_id: id,
    message: `🏆 Match result: ${result}`,
    event_type: 'result',
  });

  // Coaching insights take a while per player, so generate them after the response is sent
  after(async () => {
    try {
      await generateCoachingInsights(id);
    } catch (err) {
      console.error('[coaching-insights] generation failed for match', id, err);
    }
  });

  return { success: true, data: data as MatchScorecard };
}

export async function adminAwardMatchCreds(
  scorecardId: string,
  targetUserId: string,
  amount: number,
  reason: string
): Promise<ActionResult<{ awarded: number }>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('award_match_creds', {
    p_scorecard_id: scorecardId,
    p_user_id: targetUserId,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };

  const result = data as { ok: boolean; error?: string; awarded?: number };
  if (!result.ok) return { success: false, error: result.error ?? 'Failed to award Scores' };

  return { success: true, data: { awarded: result.awarded ?? amount } };
}


// ─── Ball-by-ball scoring ───────────────────────────────────────────────────

/** The signed-in user must be a club admin or coach of the scorecard's club. */
async function scorerContext(scorecardId: string) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data: card } = await supabase.from('match_scorecards').select('id, club_id, status').eq('id', scorecardId).maybeSingle();
  if (!card) return { ok: false as const, error: 'Match not found' };
  const { data: member } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', card.club_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['club_admin', 'coach'])
    .maybeSingle();
  if (!member) return { ok: false as const, error: 'Only a club admin or coach can score' };
  return { ok: true as const, userId, supabase, card };
}

type Db = Awaited<ReturnType<typeof createClient>>;

async function loadDeliveries(supabase: Db, scorecardId: string): Promise<Delivery[]> {
  const { data } = await supabase.from('match_deliveries').select('*').eq('scorecard_id', scorecardId).order('seq', { ascending: true });
  return (data ?? []) as Delivery[];
}

/** Rebuild the innings totals and the figures of every player involved from the deliveries. */
async function syncFromDeliveries(supabase: Db, scorecardId: string, deliveries: Delivery[]) {
  const m = summarise(deliveries);
  const asJson = (i: { runs: number; wickets: number; overs: string; extras: number }): InningsState => ({
    runs: i.runs, wickets: i.wickets, overs: i.overs, extras: i.extras,
  });
  await supabase
    .from('match_scorecards')
    .update({ our_innings: asJson(m.innings.our), their_innings: asJson(m.innings.their), updated_at: new Date().toISOString() })
    .eq('id', scorecardId);

  const ids = new Set([...Object.keys(m.batters), ...Object.keys(m.bowlers), ...Object.keys(m.fielders)]);
  if (ids.size === 0) return m;
  const rows = [...ids].map((uid) => {
    const b = m.batters[uid];
    const bw = m.bowlers[uid];
    const f = m.fielders[uid];
    return {
      scorecard_id: scorecardId,
      user_id: uid,
      ...(b ? { runs: b.runs, balls_faced: b.balls_faced, fours: b.fours, sixes: b.sixes, how_out: b.how_out, batting_position: b.batting_position } : {}),
      ...(bw ? { overs_bowled: bw.overs_bowled, runs_conceded: bw.runs_conceded, wickets: bw.wickets, maidens: bw.maidens } : {}),
      ...(f ? { catches: f.catches, run_outs: f.run_outs, stumpings: f.stumpings } : {}),
    };
  });
  await supabase.from('match_player_scores').upsert(rows, { onConflict: 'scorecard_id,user_id' });
  return m;
}

async function displayName(supabase: Db, userId: string | null | undefined): Promise<string | undefined> {
  if (!userId) return undefined;
  const { data } = await supabase.from('profiles').select('display_name, full_name').eq('id', userId).maybeSingle();
  return (data?.display_name as string | undefined) ?? (data?.full_name as string | undefined) ?? undefined;
}

/** Record one delivery, then bring totals, figures and commentary up to date. */
export async function recordDelivery(
  scorecardId: string,
  input: DeliveryInput,
): Promise<ActionResult<{ legalBalls: number; overs: string; runs: number; wickets: number }>> {
  const ctx = await scorerContext(scorecardId);
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, userId, card } = ctx;
  if (card.status === 'completed') return { success: false, error: 'This match is already complete' };

  if (input.extra_type === 'none' && input.extra_runs !== 0) return { success: false, error: 'Extra runs need an extra type' };
  if (input.wicket && !input.dismissal_type) return { success: false, error: 'Choose how the batter was out' };

  const existing = await loadDeliveries(supabase, scorecardId);
  const legalBefore = existing.filter((d) => d.innings === input.innings && d.is_legal_delivery).length;
  const legal = isLegal(input.extra_type);
  const pos = nextBallPosition(legalBefore, legal);
  const seq = (existing.length ? existing[existing.length - 1].seq : 0) + 1;

  const { data: inserted, error } = await supabase
    .from('match_deliveries')
    .insert({ ...input, ...pos, is_legal_delivery: legal, seq, scorecard_id: scorecardId, created_by: userId })
    .select()
    .single();
  if (error || !inserted) return { success: false, error: error?.message ?? 'Could not record the ball' };

  const all = [...existing, inserted as Delivery];
  const m = await syncFromDeliveries(supabase, scorecardId, all);
  const inn = m.innings[input.innings as InningsSide];

  const line = commentaryFor(
    inserted as Delivery,
    {
      batter: await displayName(supabase, input.striker_user_id),
      dismissed: await displayName(supabase, input.dismissed_user_id),
      bowler: await displayName(supabase, input.bowler_user_id),
    },
    { runs: inn.runs, wickets: inn.wickets, overs: inn.overs },
  );
  if (line) {
    await supabase.from('match_commentary').insert({ scorecard_id: scorecardId, message: line.message, event_type: line.event_type, delivery_id: (inserted as Delivery).id });
  }

  return { success: true, data: { legalBalls: inn.legalBalls, overs: inn.overs, runs: inn.runs, wickets: inn.wickets } };
}

/** Undo the most recent ball and rebuild everything without it. */
export async function undoLastDelivery(scorecardId: string): Promise<ActionResult<{ removed: boolean }>> {
  const ctx = await scorerContext(scorecardId);
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, card } = ctx;
  if (card.status === 'completed') return { success: false, error: 'This match is already complete' };

  const existing = await loadDeliveries(supabase, scorecardId);
  const last = existing[existing.length - 1];
  if (!last?.id) return { success: true, data: { removed: false } };

  const { error } = await supabase.from('match_deliveries').delete().eq('id', last.id);
  if (error) return { success: false, error: error.message };

  const remaining = existing.slice(0, -1);
  const m = await syncFromDeliveries(supabase, scorecardId, remaining);

  // A player whose only involvement was the removed ball has no figures left: zero their batting and bowling.
  const stillInvolved = new Set([...Object.keys(m.batters), ...Object.keys(m.bowlers), ...Object.keys(m.fielders)]);
  const lastIds = [last.striker_user_id, last.non_striker_user_id, last.bowler_user_id, last.fielder_user_id, last.dismissed_user_id].filter((x): x is string => !!x);
  for (const uid of lastIds.filter((id) => !stillInvolved.has(id))) {
    await supabase
      .from('match_player_scores')
      .update({ runs: 0, balls_faced: 0, fours: 0, sixes: 0, how_out: null, batting_position: null, overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0, catches: 0, run_outs: 0, stumpings: 0 })
      .eq('scorecard_id', scorecardId)
      .eq('user_id', uid);
  }
  return { success: true, data: { removed: true } };
}
