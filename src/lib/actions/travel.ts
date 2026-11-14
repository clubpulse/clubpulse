'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { TravelLog, ClubTour, TourParticipant } from '@/lib/types/travel';

// Player logs their own travel to an away fixture
export async function logTravel(
  clubId: string,
  date: string,
  destination: string,
  distanceMiles: number,
  mode: string,
  notes?: string,
): Promise<ActionResult<{ creds_awarded: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('award_travel_points', {
    p_club_id: clubId,
    p_travel_date: date,
    p_destination: destination,
    p_distance_miles: distanceMiles,
    p_travel_mode: mode,
    p_fixture_id: null,
    p_notes: notes ?? null,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.ok) return { success: false, error: data?.error ?? 'Failed to log travel' };

  return { success: true, data: { creds_awarded: data.creds_awarded as number } };
}

// My travel history for a club
export async function getMyTravelLog(clubId: string): Promise<ActionResult<TravelLog[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('travel_logs')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .order('travel_date', { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as TravelLog[] };
}

// Aggregated stats for a player in a club
export async function getMyTravelStats(clubId: string): Promise<ActionResult<{
  trip_count: number;
  total_miles: number;
  total_creds: number;
}>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('travel_logs')
    .select('distance_miles, creds_awarded')
    .eq('club_id', clubId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  const rows = data ?? [];
  return {
    success: true,
    data: {
      trip_count: rows.length,
      total_miles: rows.reduce((s, r) => s + (r.distance_miles ?? 0), 0),
      total_creds: rows.reduce((s, r) => s + (r.creds_awarded ?? 0), 0),
    },
  };
}

// Active tours for a club
export async function getClubTours(clubId: string): Promise<ActionResult<ClubTour[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('club_tours')
    .select('*, tour_participants(count)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('start_date', { ascending: true });

  if (error) return { success: false, error: error.message };

  const tours: ClubTour[] = (data ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    participant_count: Array.isArray(t.tour_participants)
      ? (t.tour_participants[0] as { count: number } | undefined)?.count ?? 0
      : 0,
  })) as ClubTour[];

  return { success: true, data: tours };
}

// Admin: create a new tour
export async function createTour(clubId: string, payload: {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  base_creds_reward: number;
  bonus_per_day: number;
}): Promise<ActionResult<ClubTour>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('club_tours')
    .insert({ club_id: clubId, created_by: user.id, ...payload })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ClubTour };
}

// Admin: award tour participation Scores to a player
export async function awardTourParticipation(
  tourId: string,
  userId: string,
  daysAttended: number,
): Promise<ActionResult<{ creds_awarded: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('award_tour_participation', {
    p_tour_id: tourId,
    p_user_id: userId,
    p_days_attended: daysAttended,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.ok) return { success: false, error: data?.error ?? 'Failed to award participation' };

  return { success: true, data: { creds_awarded: data.creds_awarded as number } };
}

// Club-wide travel leaderboard
export async function getClubTravelLeaderboard(clubId: string): Promise<ActionResult<{
  user_id: string;
  total_miles: number;
  total_creds: number;
  trip_count: number;
}[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('travel_logs')
    .select('user_id, distance_miles, creds_awarded')
    .eq('club_id', clubId);

  if (error) return { success: false, error: error.message };

  const byUser = new Map<string, { total_miles: number; total_creds: number; trip_count: number }>();
  for (const row of data ?? []) {
    const existing = byUser.get(row.user_id) ?? { total_miles: 0, total_creds: 0, trip_count: 0 };
    byUser.set(row.user_id, {
      total_miles: existing.total_miles + (row.distance_miles ?? 0),
      total_creds: existing.total_creds + (row.creds_awarded ?? 0),
      trip_count: existing.trip_count + 1,
    });
  }

  const leaderboard = Array.from(byUser.entries())
    .map(([user_id, stats]) => ({ user_id, ...stats }))
    .sort((a, b) => b.total_creds - a.total_creds);

  return { success: true, data: leaderboard };
}

// Admin: list all travel logs for a club
export async function getClubTravelLogs(clubId: string): Promise<ActionResult<TravelLog[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('travel_logs')
    .select('*')
    .eq('club_id', clubId)
    .order('travel_date', { ascending: false })
    .limit(100);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as TravelLog[] };
}

// Admin: get participants for a tour
export async function getTourParticipants(tourId: string): Promise<ActionResult<TourParticipant[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('tour_participants')
    .select('*')
    .eq('tour_id', tourId)
    .order('awarded_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as TourParticipant[] };
}
