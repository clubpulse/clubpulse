'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { namesAlreadyAuthorised } from '@/lib/profile/lookup';
import { requireUser } from '@/lib/auth/server';
import { checkXI, type MyXIState, myXIState } from '@/lib/xi-selection/logic';
import type { AvailabilityStatus, FixtureGridRow } from '@/lib/types/availability';

export type XISelection = {
  fixture_id: string;
  selected_players: string[];
  twelfth_man: string | null;
  notes: string | null;
  confirmed_at: string;
};

export type SelectionRow = FixtureGridRow & { selection: XISelection | null };

/** Club admins and coaches may name the XI. Returns the club they act for, or null. */
export async function getSelectorClubId(userId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['club_admin', 'coach'])
    .limit(1)
    .maybeSingle();
  return (data?.club_id as string | undefined) ?? null;
}

async function isSelectorForClub(userId: string, clubId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('id')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .in('role', ['club_admin', 'coach'])
    .maybeSingle();
  return !!data;
}

/** Upcoming fixtures with every player's availability and the confirmed XI, for admins and coaches. */
export async function getSelectionGrid(clubId: string): Promise<SelectionRow[]> {
  const user = await requireUser();
  if (!(await isSelectorForClub(user.id, clubId))) return [];

  const db = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const { data: fixtures } = await db
    .from('fixtures').select('*').eq('club_id', clubId).gte('match_date', today)
    .order('match_date', { ascending: true }).limit(28);
  if (!fixtures || fixtures.length === 0) return [];

  const ids = fixtures.map((f) => f.id as string);
  const [{ data: avail }, { data: members }, { data: selections }] = await Promise.all([
    db.from('fixture_availability').select('fixture_id, user_id, status').in('fixture_id', ids),
    db.from('club_members').select('user_id').eq('club_id', clubId).eq('is_active', true),
    db.from('fixture_team_selections').select('fixture_id, selected_players, twelfth_man, notes, confirmed_at').in('fixture_id', ids),
  ]);

  const cards = await namesAlreadyAuthorised((members ?? []).map((m) => m.user_id));
  const names = new Map<string, { full_name: string; display_name: string }>();
  for (const m of members ?? []) {
    const p = cards.get(m.user_id as string);
    names.set(m.user_id as string, { full_name: p?.full_name ?? 'Unknown', display_name: p?.display_name ?? p?.full_name ?? 'Unknown' });
  }
  const selByFixture = new Map<string, XISelection>();
  for (const s of (selections ?? []) as XISelection[]) selByFixture.set(s.fixture_id, s);

  return fixtures.map((f) => {
    const statusByUser = new Map<string, AvailabilityStatus>();
    for (const a of (avail ?? []) as { fixture_id: string; user_id: string; status: AvailabilityStatus }[]) {
      if (a.fixture_id === f.id) statusByUser.set(a.user_id, a.status);
    }
    const players = Array.from(names.entries()).map(([user_id, n]) => ({
      user_id, full_name: n.full_name, display_name: n.display_name, status: statusByUser.get(user_id) ?? ('unknown' as AvailabilityStatus),
    }));
    const counts = {
      available: players.filter((p) => p.status === 'available').length,
      unavailable: players.filter((p) => p.status === 'unavailable').length,
      maybe: players.filter((p) => p.status === 'maybe').length,
      unknown: players.filter((p) => p.status === 'unknown').length,
    };
    return { ...(f as FixtureGridRow), counts, players, selection: selByFixture.get(f.id as string) ?? null };
  });
}

export type ConfirmResult = { success: boolean; error?: string; warnings?: string[] };

/** Confirm or update the XI for a fixture. Admins and coaches of that fixture's club only. */
export async function confirmXI(input: {
  fixtureId: string;
  players: string[];
  twelfthMan?: string | null;
  notes?: string;
}): Promise<ConfirmResult> {
  const user = await requireUser();
  const db = createAdminClient();

  const { data: fixture } = await db.from('fixtures').select('id, club_id').eq('id', input.fixtureId).maybeSingle();
  if (!fixture) return { success: false, error: 'Fixture not found.' };
  const clubId = fixture.club_id as string;
  if (!(await isSelectorForClub(user.id, clubId))) return { success: false, error: 'Only club admins and coaches can name the XI.' };

  const twelfth = input.twelfthMan ?? null;
  const wanted = [...input.players, ...(twelfth ? [twelfth] : [])];

  // Everyone picked must be an active member of this club.
  const { data: members } = await db.from('club_members').select('user_id').eq('club_id', clubId).eq('is_active', true).in('user_id', wanted.length ? wanted : ['00000000-0000-0000-0000-000000000000']);
  const memberIds = new Set((members ?? []).map((m) => m.user_id as string));
  if (wanted.some((id) => !memberIds.has(id))) return { success: false, error: 'Everyone picked must be an active member of the club.' };

  const { data: avail } = await db.from('fixture_availability').select('user_id, status').eq('fixture_id', input.fixtureId);
  const status = new Map((avail ?? []).map((a) => [a.user_id as string, a.status as AvailabilityStatus]));
  const pickedCards = await namesAlreadyAuthorised((members ?? []).map((m) => m.user_id));
  const nameMap = new Map((members ?? []).map((m) => {
    const p = pickedCards.get(m.user_id as string);
    return [m.user_id as string, p?.display_name ?? p?.full_name ?? 'A player'];
  }));

  const check = checkXI({ players: input.players, twelfthMan: twelfth, statusOf: (id) => status.get(id), nameOf: (id) => nameMap.get(id) ?? 'A player' });
  if (!check.ok) return { success: false, error: check.errors.join(' ') };

  // Write as the signed-in user so the row-level security policy is the final gate.
  const supabase = await createClient();
  const { error } = await supabase.from('fixture_team_selections').upsert(
    {
      fixture_id: input.fixtureId,
      club_id: clubId,
      selected_players: input.players,
      twelfth_man: twelfth,
      notes: input.notes?.trim() || null,
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'fixture_id' },
  );
  if (error) return { success: false, error: error.message };

  revalidatePath('/availability');
  revalidatePath('/team-selection');
  revalidatePath('/admin/club/availability');
  revalidatePath('/dashboard');
  return { success: true, warnings: check.warnings };
}

/** For a player: where they stand in each fixture's XI. Read-only. */
export async function getMyXIStates(fixtureIds: string[]): Promise<Record<string, MyXIState>> {
  if (fixtureIds.length === 0) return {};
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('fixture_team_selections')
    .select('fixture_id, selected_players, twelfth_man')
    .in('fixture_id', fixtureIds);
  const byFixture = new Map((data ?? []).map((s) => [s.fixture_id as string, s as { selected_players: string[]; twelfth_man: string | null }]));
  const out: Record<string, MyXIState> = {};
  for (const id of fixtureIds) out[id] = myXIState(byFixture.get(id), user.id);
  return out;
}

