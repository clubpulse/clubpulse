'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { MatchMood, MoodCorrelation, MoodType, TeamMoodSummary } from '@/lib/types/match-mood';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Upsert the current user's mood for an upcoming fixture. */
export async function setMyMood(
  fixtureId: string,
  mood: MoodType,
): Promise<ActionResult<MatchMood>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('match_moods')
    .upsert(
      { user_id: userId, fixture_id: fixtureId, mood, set_at: new Date().toISOString() },
      { onConflict: 'user_id,fixture_id' },
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MatchMood };
}

/** Last 10 moods for the current user, ordered newest first. */
export async function getMyMoodHistory(
  userId: string,
): Promise<ActionResult<Array<MatchMood & { fixture_date: string; opponent: string }>>> {
  const callerId = await currentUserId();
  if (!callerId || callerId !== userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('match_moods')
    .select('*, fixtures(match_date, opponent)')
    .eq('user_id', userId)
    .order('set_at', { ascending: false })
    .limit(10);

  if (error) return { success: false, error: error.message };

  const rows = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    fixture_id: row.fixture_id as string,
    mood: row.mood as MoodType,
    set_at: row.set_at as string,
    fixture_date: (row.fixtures as Record<string, unknown>)?.match_date as string ?? '',
    opponent: (row.fixtures as Record<string, unknown>)?.opponent as string ?? 'Unknown',
  }));

  return { success: true, data: rows };
}

/** Mood-performance correlation for a user from the view. */
export async function getMyMoodCorrelation(
  userId: string,
): Promise<ActionResult<MoodCorrelation[]>> {
  const callerId = await currentUserId();
  if (!callerId || callerId !== userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mood_performance_correlation')
    .select('mood, total_games, avg_runs, avg_wickets, avg_form_rating')
    .eq('user_id', userId)
    .order('total_games', { ascending: false });

  if (error) {
    // View may not exist if migration hasn't run yet — return empty gracefully
    return { success: true, data: [] };
  }
  return { success: true, data: (data ?? []) as MoodCorrelation[] };
}

/** Aggregate team mood for a fixture — only available to club admin/coach. */
export async function getTeamMood(
  fixtureId: string,
  clubId: string,
): Promise<ActionResult<TeamMoodSummary>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  // Verify the caller is admin or coach of this club
  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .in('role', ['admin', 'coach'])
    .single();

  if (!membership) return { success: false, error: 'Not authorised' };

  const { data: moods, error } = await supabase
    .from('match_moods')
    .select('mood')
    .eq('fixture_id', fixtureId);

  if (error) return { success: false, error: error.message };

  const { data: squadData } = await supabase
    .from('club_members')
    .select('id', { count: 'exact' })
    .eq('club_id', clubId);

  const squadSize = squadData?.length ?? 0;
  const moodCounts: Record<string, number> = {
    pumped: 0, nervous: 0, tired: 0, focused: 0, injured: 0, unknown: 0,
  };
  for (const row of moods ?? []) {
    moodCounts[row.mood] = (moodCounts[row.mood] ?? 0) + 1;
  }

  return {
    success: true,
    data: {
      fixture_id: fixtureId,
      moods: moodCounts as Record<MoodType, number>,
      total_responses: (moods ?? []).length,
      squad_size: squadSize,
    },
  };
}

/** Upcoming fixtures in the next 7 days for a club, for mood-setting. */
export async function getUpcomingFixturesToSetMood(
  clubId: string,
): Promise<ActionResult<Array<{ id: string; match_date: string; opponent: string; my_mood: MoodType | null }>>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select('id, match_date, opponent')
    .eq('club_id', clubId)
    .gte('match_date', now)
    .lte('match_date', in7Days)
    .order('match_date', { ascending: true });

  if (error) return { success: false, error: error.message };
  if (!fixtures?.length) return { success: true, data: [] };

  const fixtureIds = fixtures.map((f: { id: string }) => f.id);
  const { data: existingMoods } = await supabase
    .from('match_moods')
    .select('fixture_id, mood')
    .eq('user_id', userId)
    .in('fixture_id', fixtureIds);

  const moodMap = new Map<string, MoodType>();
  for (const m of existingMoods ?? []) {
    moodMap.set(m.fixture_id, m.mood as MoodType);
  }

  const rows = fixtures.map((f: { id: string; match_date: string; opponent: string }) => ({
    id: f.id,
    match_date: f.match_date,
    opponent: f.opponent,
    my_mood: moodMap.get(f.id) ?? null,
  }));

  return { success: true, data: rows };
}
