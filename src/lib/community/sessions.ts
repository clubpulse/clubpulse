// Nets and pick-up games. Server side; the age-band rules live in rules.ts and are applied here,
// never only in the screens.

import { createAdminClient } from '@/lib/supabase/admin';
import { awardScores } from '@/lib/scores/context';
import { checkContent } from './moderation';
import { blockedIds, clubsInScope, getViewer, people, ok, no, type Admin, type Result, holdFor } from './service';
import { checkCapacity, checkPlace, checkWhen, mayHost, maySeeSession, maySignUp, roughDistance, SESSION_KINDS, type AgeBand, type Scope, type SessionContext, type SessionKind } from './rules';

async function context(admin: Admin, userId: string): Promise<SessionContext & { clubNames: Map<string, string> }> {
  const viewer = await getViewer(admin, userId);
  const { data: staff } = await admin.from('club_members').select('club_id, role').eq('user_id', userId).eq('is_active', true).in('role', ['coach', 'club_admin']);
  return {
    viewerJunior: viewer.junior, viewerClubIds: viewer.clubIds,
    // Per-club staff status is checked in mayHostHere; this flag is "staff somewhere", narrowed below
    viewerIsClubStaff: (staff ?? []).length > 0, clubNames: new Map(),
  };
}

async function isStaffAt(admin: Admin, userId: string, clubId: string): Promise<boolean> {
  const { data } = await admin.from('club_members').select('role').eq('user_id', userId).eq('club_id', clubId).eq('is_active', true).in('role', ['coach', 'club_admin']).limit(1);
  return (data ?? []).length > 0;
}

export type SessionCard = {
  id: string; kind: SessionKind; band: AgeBand; title: string; note: string; place: string; startsAt: string;
  capacity: number; taken: number; club: string; distance: string | null;
  host: string; hostId: string; mine: boolean; joined: boolean; canJoin: boolean;
};

export async function listSessions(userId: string, scope: Scope, kind: SessionKind | null): Promise<Result<SessionCard[]>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  const base = await context(admin, userId);
  const clubs = await clubsInScope(admin, viewer, scope);
  let q = admin.from('community_sessions').select('id, host_id, club_id, kind, age_band, title, note, place, starts_at, capacity').eq('status', 'open').gt('starts_at', new Date().toISOString()).order('starts_at').limit(60);
  if (kind) q = q.eq('kind', kind);
  if (clubs !== 'all') q = q.in('club_id', [...clubs.keys()].length ? [...clubs.keys()] : ['00000000-0000-0000-0000-000000000000']);
  const { data, error } = await q;
  if (error) return no('Could not load sessions.');
  const blocked = await blockedIds(admin, userId);
  const rows = [];
  for (const s of data ?? []) {
    if (blocked.has(s.host_id as string)) continue;
    const staffHere = base.viewerClubIds.includes(s.club_id as string) && await isStaffAt(admin, userId, s.club_id as string);
    if (!maySeeSession(s.age_band as AgeBand, { ...base, viewerIsClubStaff: staffHere }, s.club_id as string)) continue;
    rows.push(s);
  }
  const ids = rows.map((s) => s.id as string);
  const [{ data: signups }, who, { data: clubRows }] = await Promise.all([
    ids.length ? admin.from('community_session_signups').select('session_id, user_id').in('session_id', ids) : Promise.resolve({ data: [] as Array<{ session_id: string; user_id: string }> }),
    people(admin, rows.map((s) => s.host_id as string)),
    ids.length ? admin.from('clubs').select('id, name').in('id', [...new Set(rows.map((s) => s.club_id as string))]) : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);
  const clubName = new Map((clubRows ?? []).map((c) => [c.id as string, c.name as string]));
  return ok(rows.map((s) => {
    const taken = (signups ?? []).filter((x) => x.session_id === s.id);
    const band = s.age_band as AgeBand;
    const miles = clubs !== 'all' ? clubs.get(s.club_id as string)?.miles ?? null : null;
    const joined = taken.some((x) => x.user_id === userId);
    return {
      id: s.id as string, kind: s.kind as SessionKind, band, title: s.title as string, note: (s.note as string | null) ?? '', place: s.place as string,
      startsAt: s.starts_at as string, capacity: s.capacity as number, taken: taken.length, club: clubName.get(s.club_id as string) ?? 'Club',
      // Junior sessions never show a distance; adults see it rounded to a mile
      distance: band === 'adult' && miles !== null && miles > 0 ? roughDistance(miles) : null,
      host: who.get(s.host_id as string)?.name ?? 'Member', hostId: s.host_id as string, mine: s.host_id === userId, joined,
      canJoin: !joined && taken.length < (s.capacity as number) && s.host_id !== userId && maySignUp(band, base, s.club_id as string),
    };
  }));
}

export type NewSession = { kind: unknown; band: unknown; clubId: unknown; title: unknown; note: unknown; place: unknown; startsAt: unknown; capacity: unknown };

export async function createSession(userId: string, input: NewSession): Promise<Result<{ id: string | null; held: boolean; tell: string | null }>> {
  if (!SESSION_KINDS.includes(input.kind as SessionKind)) return no('Choose nets or a pick-up game.');
  if (input.band !== 'adult' && input.band !== 'junior') return no('Choose who it is for.');
  if (typeof input.clubId !== 'string' || typeof input.title !== 'string' || typeof input.place !== 'string' || typeof input.startsAt !== 'string') return no('Fill in the title, place and time.');
  if (!checkCapacity(input.capacity)) return no('Choose between 2 and 30 places.');
  const title = input.title.trim().slice(0, 80);
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 300) : '';
  if (title.length < 3) return no('Give it a short title.');
  const when = new Date(input.startsAt);
  if (Number.isNaN(when.getTime())) return no('Pick a date and time.');
  const w = checkWhen(when); if (!w.ok) return no(w.reason);
  const p = checkPlace(input.place); if (!p.ok) return no(p.reason);

  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const base = await context(admin, userId);
  const staffHere = await isStaffAt(admin, userId, input.clubId);
  if (!mayHost(input.band, { ...base, viewerIsClubStaff: staffHere }, input.clubId)) {
    return no(base.viewerJunior ? 'Under-18s cannot host sessions. Ask your coach.' : input.band === 'junior' ? 'Only a coach or club admin can set up a junior session.' : 'You can only set up sessions for a club you belong to.');
  }
  // Everything written is checked like a post, and a junior session is read as if children will see it
  const text = [title, note, input.place].filter(Boolean).join('\n');
  const check = await checkContent(text, { place: 'public', authorJunior: false, readerJunior: true }, 600);
  // A plain rule refusal (a phone number, a private address) is not stored. If the AI check is busy, unavailable or
  // unsure, the session is saved as held and goes to SHIFTUP staff, who allow or remove it. Nobody can see it until
  // then, apart from the host, who is told.
  if (check.status === 'held' && !check.held) return ok({ id: null, held: true, tell: check.tell });
  const queued = check.status === 'held';
  const { data, error } = await admin.from('community_sessions').insert({
    host_id: userId, club_id: input.clubId, kind: input.kind, age_band: input.band, title, note: note || null,
    place: input.place.trim(), starts_at: when.toISOString(), capacity: input.capacity,
    status: queued ? 'held' : 'open', held_reason: queued ? check.tell : null,
  }).select('id').single();
  if (error || !data) return no('Could not save the session.');
  return ok({ id: data.id as string, held: queued, tell: queued ? 'Thanks. SHIFTUP will check this and it will go live once approved.' : null });
}

export async function joinSession(userId: string, sessionId: unknown, on: boolean): Promise<Result<{ joined: boolean }>> {
  if (typeof sessionId !== 'string') return no('Session not found.');
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  if (!on) {
    await admin.from('community_session_signups').delete().eq('session_id', sessionId).eq('user_id', userId);
    return ok({ joined: false });
  }
  const { data: s } = await admin.from('community_sessions').select('id, host_id, club_id, age_band, capacity, status, starts_at').eq('id', sessionId).maybeSingle();
  if (!s || s.status !== 'open' || new Date(s.starts_at as string).getTime() <= Date.now()) return no('Session not found.');
  const [base, blocked, { count }] = await Promise.all([
    context(admin, userId), blockedIds(admin, userId),
    admin.from('community_session_signups').select('user_id', { count: 'exact', head: true }).eq('session_id', sessionId),
  ]);
  if (blocked.has(s.host_id as string)) return no('Session not found.');
  // Enforced here, not only by hiding the button
  if (!maySignUp(s.age_band as AgeBand, base, s.club_id as string)) return no('This session is not open to you.');
  if (s.host_id === userId) return no('You are hosting this one.');
  if ((count ?? 0) >= (s.capacity as number)) return no('This session is full.');
  const { error } = await admin.from('community_session_signups').upsert({ session_id: sessionId, user_id: userId });
  if (error) return no('Could not join.');
  await awardScores(userId, s.club_id as string, 'community_session', sessionId).catch(() => undefined);
  return ok({ joined: true });
}

export async function cancelSession(userId: string, sessionId: unknown): Promise<Result<{ cancelled: true }>> {
  if (typeof sessionId !== 'string') return no('Session not found.');
  const { data } = await createAdminClient().from('community_sessions').update({ status: 'cancelled' }).eq('id', sessionId).eq('host_id', userId).select('id');
  return (data ?? []).length ? ok({ cancelled: true }) : no('Session not found.');
}
