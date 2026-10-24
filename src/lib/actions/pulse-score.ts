'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { ClubPulseScore } from '@/lib/types/pulse-score';

export async function getLatestPulseScore(clubId: string): Promise<ActionResult<ClubPulseScore>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('club_pulse_scores')
    .select('*')
    .eq('club_id', clubId)
    .order('snapshot_week', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'No pulse score found' };
  return { success: true, data };
}

export async function getPulseHistory(clubId: string, weeks = 8): Promise<ActionResult<ClubPulseScore[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('club_pulse_scores')
    .select('*')
    .eq('club_id', clubId)
    .order('snapshot_week', { ascending: false })
    .limit(weeks);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).reverse() };
}

export async function calculatePulseScore(clubId: string): Promise<ActionResult<{ score: number; week: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('calculate_pulse_score', { p_club_id: clubId });

  if (error) return { success: false, error: error.message };
  if (!data?.ok) return { success: false, error: data?.error ?? 'Calculation failed' };
  return { success: true, data: { score: data.score, week: data.week } };
}

export async function getPulseScoreTrend(clubId: string): Promise<ActionResult<{ current: number; previous: number; delta: number }>> {
  const history = await getPulseHistory(clubId, 2);
  if (!history.success) return history as ActionResult<never>;

  const scores = history.data;
  if (scores.length === 0) return { success: false, error: 'No history' };

  const current = scores[scores.length - 1].score;
  const previous = scores.length > 1 ? scores[scores.length - 2].score : current;
  return { success: true, data: { current, previous, delta: current - previous } };
}

export async function getClubIdForUser(): Promise<string | null> {
  const supabase = await createClient();
  const user = await requireUser();

  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  return data?.club_id ?? null;
}
