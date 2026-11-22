// Server-only. One live fact per pillar for the cards on Home. Each is a single cheap query, never a
// feed, and a missing table (a migration not run yet) gives a plain fallback instead of an error.

import { createAdminClient } from '@/lib/supabase/admin';
import { communityOpen } from '@/lib/community/service';
import { weekStartIso } from '@/lib/scores/context';
import { ukToday } from '@/lib/utils/uk-date';
import type { PillarKey } from './pillars';

export type PillarFacts = Record<PillarKey, string>;

/** "today", "yesterday" or "N days ago" for a timestamp, in whole UK days. */
export function daysAgoLabel(then: string, now: Date = new Date()): string {
  const a = new Date(`${ukToday(new Date(then))}T12:00:00Z`).getTime();
  const b = new Date(`${ukToday(now)}T12:00:00Z`).getTime();
  const n = Math.round((b - a) / 86_400_000);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export async function getPillarFacts(userId: string): Promise<PillarFacts> {
  const admin = createAdminClient();
  const today = ukToday();
  const open = communityOpen();
  const [analysis, readiness, academy, requests] = await Promise.all([
    admin.from('analysis_results').select('created_at', { count: 'exact' }).eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
    admin.from('wellness_readiness').select('check_date').eq('user_id', userId).eq('check_date', today).maybeSingle(),
    admin.from('academy_progress').select('lesson_id, first_passed_at').eq('user_id', userId).eq('passed', true),
    open ? admin.from('community_connections').select('id', { count: 'exact', head: true }).eq('addressee_id', userId).eq('status', 'pending') : Promise.resolve({ count: 0, error: null }),
  ]);

  const last = (analysis.data ?? [])[0]?.created_at as string | undefined;
  const technique = analysis.error || !last ? 'Film a session to get your first analysis' : `Last analysed ${daysAgoLabel(last)} · ${plural(analysis.count ?? 1, 'analysis', 'analyses')} saved`;

  const wellness = readiness.error ? 'Check in before your next match' : readiness.data ? 'Today’s readiness check-in is done' : 'Today’s readiness check-in is not done yet';

  const week = weekStartIso();
  const passed = academy.data ?? [];
  const thisWeek = passed.filter((r) => (r.first_passed_at as string | null) && (r.first_passed_at as string) >= week).length;
  const academyFact = academy.error ? 'Two-minute lessons and a practice plan' : `${plural(thisWeek, 'lesson')} passed this week · ${passed.length} of 20 in all`;

  const community = !open ? 'Opening once safety checks are complete' : (requests.count ?? 0) > 0 ? `${plural(requests.count ?? 0, 'connection request')} waiting` : 'No requests waiting';

  return { technique, community, wellness, academy: academyFact };
}
