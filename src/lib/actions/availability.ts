'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { AvailabilityStatus, FixtureWithMyStatus, FixtureGridRow } from '@/lib/types/availability';

/**
 * Fetch upcoming fixtures for the given club, each annotated with the
 * current user's availability status.
 */
export async function getMyFixtures(clubId: string): Promise<FixtureWithMyStatus[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: fixtures, error: fixturesError } = await supabase
    .from('fixtures')
    .select('*')
    .eq('club_id', clubId)
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .limit(28); // ~4 weeks of fixtures

  if (fixturesError || !fixtures) return [];

  if (fixtures.length === 0) return [];

  const fixtureIds = fixtures.map((f) => f.id);

  const { data: myAvailability } = await supabase
    .from('fixture_availability')
    .select('fixture_id, status, note')
    .eq('user_id', user.id)
    .in('fixture_id', fixtureIds);

  const availMap = new Map<string, { status: AvailabilityStatus; note: string | null }>();
  for (const row of myAvailability ?? []) {
    availMap.set(row.fixture_id, { status: row.status as AvailabilityStatus, note: row.note });
  }

  return fixtures.map((f) => ({
    ...f,
    my_status: availMap.get(f.id)?.status ?? 'unknown',
    my_note: availMap.get(f.id)?.note ?? null,
  }));
}

/**
 * Upsert the current user's availability for a specific fixture.
 */
export async function setAvailability(
  fixtureId: string,
  status: AvailabilityStatus,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('fixture_availability').upsert(
    {
      fixture_id: fixtureId,
      user_id: user.id,
      status,
      note: note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'fixture_id,user_id' }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * For captains / admins: all upcoming fixtures with per-player availability counts and detail.
 */
export async function getFixtureGrid(clubId: string): Promise<FixtureGridRow[]> {
  await requireUser();
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: fixtures, error: fixturesError } = await supabase
    .from('fixtures')
    .select('*')
    .eq('club_id', clubId)
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .limit(28);

  if (fixturesError || !fixtures || fixtures.length === 0) return [];

  const fixtureIds = fixtures.map((f) => f.id);

  // Fetch all availability rows for these fixtures, joined with profiles
  const { data: availRows } = await supabase
    .from('fixture_availability')
    .select('fixture_id, user_id, status, profiles(full_name, display_name)')
    .in('fixture_id', fixtureIds);

  // Fetch active club members so we know the full player list (including those who haven't responded)
  const { data: members } = await supabase
    .from('club_members')
    .select('user_id, profiles(full_name, display_name)')
    .eq('club_id', clubId)
    .eq('is_active', true);

  const memberMap = new Map<string, { full_name: string; display_name: string }>();
  for (const m of members ?? []) {
    const p = m.profiles as unknown as { full_name: string; display_name: string } | null;
    memberMap.set(m.user_id, {
      full_name: p?.full_name ?? 'Unknown',
      display_name: p?.display_name ?? 'Unknown',
    });
  }

  // Index availability rows by fixture_id
  type AvailRow = {
    fixture_id: string;
    user_id: string;
    status: AvailabilityStatus;
    profiles: { full_name: string; display_name: string } | null;
  };
  const availByFixture = new Map<string, AvailRow[]>();
  for (const row of (availRows ?? []) as unknown as AvailRow[]) {
    const arr = availByFixture.get(row.fixture_id) ?? [];
    arr.push(row);
    availByFixture.set(row.fixture_id, arr);
  }

  return fixtures.map((f) => {
    const responded = availByFixture.get(f.id) ?? [];
    const respondedUserIds = new Set(responded.map((r) => r.user_id));

    const respondedPlayers = responded.map((r) => ({
      user_id: r.user_id,
      full_name: r.profiles?.full_name ?? memberMap.get(r.user_id)?.full_name ?? 'Unknown',
      display_name: r.profiles?.display_name ?? memberMap.get(r.user_id)?.display_name ?? 'Unknown',
      status: r.status,
    }));

    // Members who haven't responded at all
    const unknownPlayers = Array.from(memberMap.entries())
      .filter(([uid]) => !respondedUserIds.has(uid))
      .map(([uid, profile]) => ({
        user_id: uid,
        full_name: profile.full_name,
        display_name: profile.display_name,
        status: 'unknown' as AvailabilityStatus,
      }));

    const allPlayers = [...respondedPlayers, ...unknownPlayers];

    const counts = {
      available: allPlayers.filter((p) => p.status === 'available').length,
      unavailable: allPlayers.filter((p) => p.status === 'unavailable').length,
      maybe: allPlayers.filter((p) => p.status === 'maybe').length,
      unknown: allPlayers.filter((p) => p.status === 'unknown').length,
    };

    return { ...f, counts, players: allPlayers };
  });
}
