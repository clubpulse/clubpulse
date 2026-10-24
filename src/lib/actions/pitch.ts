'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { PitchCondition, PitchVote, PitchResult, PitchVoteAggregate, GroundHistory } from '@/lib/types/pitch';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface UpcomingFixture {
  id: string
  opponent: string
  match_date: string
  venue?: string
  club_id: string
}

/** Fixtures that don't yet have a pitch result logged */
export async function getUpcomingFixturesForVote(clubId: string): Promise<ActionResult<UpcomingFixture[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, opponent, match_date, venue, club_id')
    .eq('club_id', clubId)
    .gte('match_date', new Date().toISOString())
    .not('id', 'in', supabase.from('pitch_results').select('fixture_id').eq('club_id', clubId))
    .order('match_date', { ascending: true })
    .limit(10);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as UpcomingFixture[] };
}

/** Upsert a player's pitch prediction for a fixture */
export async function submitPitchVote(
  fixtureId: string,
  clubId: string,
  prediction: PitchCondition
): Promise<ActionResult<PitchVote>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pitch_votes')
    .upsert(
      { user_id: userId, fixture_id: fixtureId, club_id: clubId, prediction },
      { onConflict: 'user_id,fixture_id' }
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PitchVote };
}

/** Get the current user's past pitch votes with outcomes */
export async function getMyPitchVotes(userId: string): Promise<ActionResult<PitchVote[]>> {
  const callerId = await currentUserId();
  if (!callerId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pitch_votes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as PitchVote[] };
}

/** Aggregate vote distribution for a fixture */
export async function getPitchVoteAggregates(fixtureId: string): Promise<ActionResult<PitchVoteAggregate[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pitch_votes')
    .select('prediction')
    .eq('fixture_id', fixtureId);

  if (error) return { success: false, error: error.message };

  const rows = data ?? [];
  const total = rows.length;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.prediction] = (counts[row.prediction] ?? 0) + 1;
  }

  const aggregates: PitchVoteAggregate[] = (Object.entries(counts) as [PitchCondition, number][]).map(
    ([condition, count]) => ({
      condition,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    })
  );

  return { success: true, data: aggregates };
}

/** Historical pitch conditions for a club's ground */
export async function getGroundHistory(clubId: string): Promise<ActionResult<GroundHistory[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ground_pitch_history')
    .select('actual_condition, times, last_seen')
    .eq('club_id', clubId)
    .order('times', { ascending: false });

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: (data ?? []).map((row) => ({
      condition: row.actual_condition as PitchCondition,
      times: Number(row.times),
      last_seen: row.last_seen,
    })),
  };
}

/** Admin: resolve a fixture's pitch condition and award creds */
export async function adminResolvePitchVotes(
  fixtureId: string,
  condition: PitchCondition,
  notes?: string
): Promise<ActionResult<{ correct_count: number; creds_per_winner: number }>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('resolve_pitch_votes', {
    p_fixture_id: fixtureId,
    p_actual_condition: condition,
    p_notes: notes ?? null,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.ok) return { success: false, error: data?.error ?? 'Unknown error' };

  return { success: true, data: { correct_count: data.correct_count, creds_per_winner: data.creds_per_winner } };
}

/** Season accuracy stats for a user */
export async function getMyPitchAccuracy(
  userId: string
): Promise<ActionResult<{ total: number; correct: number; percent: number }>> {
  const callerId = await currentUserId();
  if (!callerId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pitch_votes')
    .select('is_correct')
    .eq('user_id', userId)
    .not('is_correct', 'is', null);

  if (error) return { success: false, error: error.message };

  const rows = data ?? [];
  const total = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { success: true, data: { total, correct, percent } };
}

/** Fetch a single pitch result for a fixture (if resolved) */
export async function getPitchResult(fixtureId: string): Promise<ActionResult<PitchResult | null>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pitch_results')
    .select('*')
    .eq('fixture_id', fixtureId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PitchResult | null };
}
