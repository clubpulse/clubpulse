// A coach's view of a player's technique progress. A coach may see the analyses of a player only
// while there is a confirmed or completed coaching booking between them: a request the coach has
// not accepted, or one that was cancelled, does not open the player's history.

import { createAdminClient } from '@/lib/supabase/admin';
import { progressByKind, type Progress, type SavedAnalysis } from './compare';

type Result<T> = { success: true; data: T } | { success: false; error: string };

const OPEN = ['confirmed', 'completed'];

export type CoachPlayer = { id: string; name: string; sessions: number };

/** The players this coach is working with or has worked with. */
export async function getCoachPlayers(coachId: string): Promise<CoachPlayer[]> {
  const admin = createAdminClient();
  const { data: bookings } = await admin.from('coaching_bookings').select('player_user_id').eq('coach_user_id', coachId).in('status', OPEN);
  const counts = new Map<string, number>();
  for (const b of bookings ?? []) counts.set(b.player_user_id as string, (counts.get(b.player_user_id as string) ?? 0) + 1);
  const ids = [...counts.keys()];
  if (ids.length === 0) return [];
  const { data: profiles } = await admin.from('profiles').select('id, full_name, display_name').in('id', ids);
  return ids
    .map((id) => {
      const p = (profiles ?? []).find((x) => x.id === id);
      return { id, name: (p?.display_name as string | null) || (p?.full_name as string | null) || 'Player', sessions: counts.get(id) ?? 0 };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One player's progress, kind by kind, for a coach who has a booking with them. */
export async function getPlayerProgress(coachId: string, playerId: string): Promise<Result<{ name: string; progress: Progress[] }>> {
  const admin = createAdminClient();
  const { count } = await admin.from('coaching_bookings').select('id', { count: 'exact', head: true })
    .eq('coach_user_id', coachId).eq('player_user_id', playerId).in('status', OPEN);
  if (!count) return { success: false, error: 'You can see progress only for players you have a confirmed session with.' };

  const [{ data: rows }, { data: profile }] = await Promise.all([
    admin.from('analysis_results').select('created_at, result_json').eq('user_id', playerId).eq('analysis_type', 'pose').order('created_at', { ascending: false }).limit(80),
    admin.from('profiles').select('full_name, display_name').eq('id', playerId).maybeSingle(),
  ]);

  const saved: SavedAnalysis[] = [];
  for (const row of rows ?? []) {
    const r = row.result_json as Partial<SavedAnalysis> | null;
    if (!r || typeof r.mode !== 'string' || typeof r.overall !== 'number' || !Array.isArray(r.metrics)) continue;
    saved.push({ mode: r.mode, view: r.view, shotType: r.shotType ?? null, overall: r.overall, metrics: r.metrics, createdAt: row.created_at as string });
  }
  return {
    success: true,
    data: { name: (profile?.display_name as string | null) || (profile?.full_name as string | null) || 'Player', progress: progressByKind(saved) },
  };
}
