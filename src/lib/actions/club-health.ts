'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { ClubHealthMetrics, ClubHealthSnapshot } from '@/lib/types/club-health';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Calls the get_club_health() SECURITY DEFINER RPC for live metrics. */
export async function getClubHealthMetrics(
  clubId: string,
): Promise<ActionResult<ClubHealthMetrics>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_club_health', { p_club_id: clubId });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ClubHealthMetrics };
}

/** Returns the last 6 monthly snapshots for trend display. */
export async function getClubHealthSnapshots(
  clubId: string,
): Promise<ActionResult<ClubHealthSnapshot[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('club_health_snapshots')
    .select('*')
    .eq('club_id', clubId)
    .order('snapshot_month', { ascending: false })
    .limit(6);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ClubHealthSnapshot[] };
}

/**
 * Saves the current live metrics as a monthly snapshot.
 * Upserts on (club_id, snapshot_month) so only one snapshot per month.
 */
export async function saveHealthSnapshot(
  clubId: string,
): Promise<ActionResult<{ snapshot_month: string }>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  // Fetch live metrics first
  const metricsResult = await getClubHealthMetrics(clubId);
  if (!metricsResult.success) return { success: false, error: metricsResult.error };

  const m = metricsResult.data;
  const now = new Date();
  const snapshotMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const supabase = await createClient();
  const { error } = await supabase.from('club_health_snapshots').upsert(
    {
      club_id: clubId,
      snapshot_month: snapshotMonth,
      total_members: m.total_members,
      active_members: m.total_members, // live data doesn't distinguish active yet
      avg_availability_rate: m.availability_rate,
      total_scores_earned: m.total_scores,
      total_scores_spent: 0,
      dressing_room_posts: m.dressing_room_posts_30d,
      fixtures_played: m.fixtures_90d,
      active_injuries_anonymous: m.active_injuries,
      mentor_sessions_count: 0,
    },
    { onConflict: 'club_id,snapshot_month' },
  );

  if (error) return { success: false, error: error.message };
  return { success: true, data: { snapshot_month: snapshotMonth } };
}
