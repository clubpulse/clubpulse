// Server-only. Who can be picked on the ball pad: active club members, the confirmed XI first.
import { createAdminClient } from '@/lib/supabase/admin';
import type { RosterPlayer } from '@/lib/types/match-day';

export async function getMatchRoster(clubId: string, fixtureId?: string | null): Promise<RosterPlayer[]> {
  const db = createAdminClient();
  const [{ data: members }, selection] = await Promise.all([
    db.from('club_members').select('user_id, profiles(full_name, display_name)').eq('club_id', clubId).eq('is_active', true),
    fixtureId
      ? db.from('fixture_team_selections').select('selected_players').eq('fixture_id', fixtureId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const xi = new Set<string>(((selection.data as { selected_players?: string[] } | null)?.selected_players) ?? []);
  return (members ?? [])
    .map((m) => {
      const p = m.profiles as unknown as { full_name?: string; display_name?: string } | null;
      return { user_id: m.user_id as string, name: p?.display_name ?? p?.full_name ?? 'Player', in_xi: xi.has(m.user_id as string) };
    })
    .sort((a, b) => Number(b.in_xi) - Number(a.in_xi) || a.name.localeCompare(b.name));
}
