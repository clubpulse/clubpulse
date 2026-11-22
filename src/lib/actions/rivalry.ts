'use server';

import { createClient } from '@/lib/supabase/server';
import { sharedClubNameCards, cardName } from '@/lib/profile/lookup';
import type { ActionResult } from '@/lib/types/action';
import type { NemesisPair, RivalryStats, MatchPerformance } from '@/lib/types/rivalry';

export async function getMyNemesis(userId: string): Promise<ActionResult<NemesisPair | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('nemesis_pairs')
    .select('*')
    .eq('batter_id', userId)
    .order('dismissals', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: true, data: null };

  const cards = await sharedClubNameCards([data.bowler_id]);
  return {
    success: true,
    data: { ...data, bowler_name: cardName(cards.get(data.bowler_id as string)) } as NemesisPair,
  };
}

export async function getMyVictims(userId: string): Promise<ActionResult<NemesisPair[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('nemesis_pairs')
    .select('*')
    .eq('bowler_id', userId)
    .order('dismissals', { ascending: false })
    .limit(10);

  if (error) return { success: false, error: error.message };
  const cards = await sharedClubNameCards((data ?? []).map((r) => r.batter_id));
  const enriched = (data ?? []).map((row) => {
    return { ...row, batter_name: cardName(cards.get(row.batter_id as string)) } as NemesisPair;
  });
  return { success: true, data: enriched };
}

export async function getRivalryStats(
  userId: string,
  opponentId: string,
): Promise<ActionResult<RivalryStats>> {
  const supabase = await createClient();

  const [nemR, encountersR, cards] = await Promise.all([
    supabase.from('nemesis_pairs').select('*').eq('batter_id', userId).eq('bowler_id', opponentId).maybeSingle(),
    supabase.from('match_performances').select('*')
      .or(`and(user_id.eq.${userId},dismissed_by.eq.${opponentId}),and(user_id.eq.${opponentId},dismissed_by.eq.${userId})`)
      .order('match_date', { ascending: false }),
    sharedClubNameCards([userId, opponentId]),
  ]);

  if (encountersR.error) return { success: false, error: encountersR.error.message };

  const getProfile = (id: string) => ({ id, name: cardName(cards.get(id)) });

  const encounters = (encountersR.data ?? []) as MatchPerformance[];
  const userBatting = encounters.filter((e) => e.user_id === userId && e.dismissed_by === opponentId);
  const userBowling = encounters.filter((e) => e.user_id === opponentId && e.dismissed_by === userId);

  return {
    success: true,
    data: {
      batter: getProfile(userId),
      bowler: getProfile(opponentId),
      dismissals: nemR.data?.dismissals ?? userBatting.length,
      lastDismissal: nemR.data?.last_dismissal ?? null,
      h2h: {
        ballsFaced: userBatting.reduce((s, e) => s + (e.balls_faced ?? 0), 0),
        runsScored: userBatting.reduce((s, e) => s + (e.runs_scored ?? 0), 0),
        wicketsTaken: userBowling.length,
        runsConceded: userBowling.reduce((s, e) => s + (e.runs_scored ?? 0), 0),
      },
      encounters,
    },
  };
}

export async function logPerformance(input: {
  club_id: string;
  match_date: string;
  opponent: string;
  runs_scored?: number;
  balls_faced?: number;
  dismissal_type?: string;
  dismissed_by?: string;
  overs_bowled?: number;
  runs_conceded?: number;
  wickets_taken?: number;
  catches?: number;
  run_outs?: number;
}): Promise<ActionResult<MatchPerformance>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('match_performances')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  // Best-effort: a failed refresh shouldn't fail the logged game
  try {
    await supabase.rpc('refresh_nemesis_pairs');
  } catch {}
  return { success: true, data: data as MatchPerformance };
}
