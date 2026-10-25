'use server';

import { createClient } from '@/lib/supabase/server';
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

  const [scorecardRes, playersRes, commentaryRes] = await Promise.all([
    supabase.from('match_scorecards').select('*').eq('id', id).single(),
    supabase.from('match_player_scores').select('*').eq('scorecard_id', id).order('batting_position'),
    supabase
      .from('match_commentary')
      .select('*')
      .eq('scorecard_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (scorecardRes.error) return { success: false, error: scorecardRes.error.message };

  return {
    success: true,
    data: {
      scorecard: scorecardRes.data as MatchScorecard,
      playerScores: (playersRes.data ?? []) as MatchPlayerScore[],
      commentary: (commentaryRes.data ?? []) as MatchCommentary[],
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
