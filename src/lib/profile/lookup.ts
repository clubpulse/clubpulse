// Server-only name lookups.
//
// public.profiles is own-row only (migration 20261122000012), so another person's name can no longer be read through
// the signed-in client, and several of the tables that used to embed `profiles(...)` point their foreign key at
// auth.users, not profiles, so the embed fails outright. Names are looked up here instead, by id, with the service
// role, and ONLY these four columns are ever selected: id, full_name, display_name, avatar_url. Never email, phone,
// date_of_birth, location or push_token.

import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/server';

export type NameCard = { id: string; full_name: string | null; display_name: string | null; avatar_url: string | null };

const COLUMNS = 'id, full_name, display_name, avatar_url';
const unique = (ids: unknown[]): string[] => [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0))];

function toMap(rows: unknown[] | null): Map<string, NameCard> {
  const out = new Map<string, NameCard>();
  for (const r of (rows ?? []) as Array<Record<string, unknown>>) {
    out.set(r.id as string, {
      id: r.id as string,
      full_name: (r.full_name as string | null) ?? null,
      display_name: (r.display_name as string | null) ?? null,
      avatar_url: (r.avatar_url as string | null) ?? null,
    });
  }
  return out;
}

/** The name to show for a card, in the order the app has always used. */
export const cardName = (c: NameCard | undefined | null, fallback = 'Unknown'): string => c?.display_name || c?.full_name || fallback;

/**
 * Names for people in one club. The signed-in person must be an active member of that club, and only active members
 * of that club are returned, so this can never be used to look up a stranger by id.
 */
export async function clubNameCards(clubId: string, ids: unknown[]): Promise<Map<string, NameCard>> {
  const wanted = unique(ids);
  if (!clubId || wanted.length === 0) return new Map();
  const caller = await getCurrentUser();
  if (!caller) return new Map();
  const admin = createAdminClient();
  const { data: members } = await admin.from('club_members').select('user_id')
    .eq('club_id', clubId).eq('is_active', true).in('user_id', [...wanted, caller.id]);
  const inClub = new Set((members ?? []).map((m) => (m as { user_id: string }).user_id));
  if (!inClub.has(caller.id)) return new Map();
  const allowed = wanted.filter((id) => inClub.has(id));
  if (allowed.length === 0) return new Map();
  const { data } = await admin.from('profiles').select(COLUMNS).in('id', allowed);
  return toMap(data);
}

/**
 * Names for adults from the public card view (no under-18s, ever). For lists that are not tied to one club, such as
 * mentors, coaches and raffle winners. Returns display_name and avatar only.
 */
export async function directoryCards(ids: unknown[]): Promise<Map<string, NameCard>> {
  const wanted = unique(ids);
  if (wanted.length === 0) return new Map();
  const { data } = await createAdminClient().from('public_profile_cards').select('id, display_name, avatar_url').in('id', wanted);
  const out = new Map<string, NameCard>();
  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    out.set(r.id as string, { id: r.id as string, full_name: null, display_name: (r.display_name as string | null) ?? null, avatar_url: (r.avatar_url as string | null) ?? null });
  }
  return out;
}

/**
 * Names by id with NO access check. Only for code that has already decided the caller may see these people (a
 * public scorecard token, a club admin's own roster) and already runs with the service role.
 */
export async function namesAlreadyAuthorised(ids: unknown[]): Promise<Map<string, NameCard>> {
  const wanted = unique(ids);
  if (wanted.length === 0) return new Map();
  const { data } = await createAdminClient().from('profiles').select(COLUMNS).in('id', wanted);
  return toMap(data);
}

/**
 * Names for people who share at least one active club with the signed-in person (themselves included). For records
 * that are not stored against one club, such as a bowler-and-batter rivalry. Strangers are never returned.
 */
export async function sharedClubNameCards(ids: unknown[]): Promise<Map<string, NameCard>> {
  const wanted = unique(ids);
  if (wanted.length === 0) return new Map();
  const caller = await getCurrentUser();
  if (!caller) return new Map();
  const admin = createAdminClient();
  const { data: mine } = await admin.from('club_members').select('club_id').eq('user_id', caller.id).eq('is_active', true);
  const clubIds = (mine ?? []).map((r) => (r as { club_id: string }).club_id);
  const allowed = new Set<string>(wanted.includes(caller.id) ? [caller.id] : []);
  if (clubIds.length > 0) {
    const { data: mates } = await admin.from('club_members').select('user_id').in('club_id', clubIds).eq('is_active', true).in('user_id', wanted);
    for (const m of mates ?? []) allowed.add((m as { user_id: string }).user_id);
  }
  if (allowed.size === 0) return new Map();
  const { data } = await admin.from('profiles').select(COLUMNS).in('id', [...allowed]);
  return toMap(data);
}
