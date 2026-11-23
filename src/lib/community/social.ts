// Server side of Community profiles, follows, club profiles and parent oversight. Built on the
// service-role client like the rest of the Community; the safeguarding rules are applied here and
// in rules.ts, never only in the screens.

import { createAdminClient } from '@/lib/supabase/admin';
import { checkContent } from './moderation';
import { randomUUID } from 'crypto';
import { raiseAlert } from '@/lib/safeguarding/alerts';
import { liveRecentPostsBy } from './review';
import { blockedIds, ok, no, people, getViewer, connectionBetween, type Admin, type Result, type Posted, holdFor, REPORT_KINDS } from './service';
import { mayFollow, mayViewProfile, milesBetween, roughDistance, type CrossBandContext } from './rules';

/** How two people relate across the age line, for profile and follow decisions. */
export async function crossBand(admin: Admin, viewerId: string, subjectId: string): Promise<CrossBandContext> {
  const [who, { data: mine }, { data: theirs }, { data: link }] = await Promise.all([
    people(admin, [viewerId, subjectId]),
    admin.from('club_members').select('club_id, role').eq('user_id', viewerId).eq('is_active', true),
    admin.from('club_members').select('club_id, role').eq('user_id', subjectId).eq('is_active', true),
    admin.from('child_profiles').select('id, parent_child_links!inner ( parent_id )').eq('linked_user_id', subjectId).eq('parent_child_links.parent_id', viewerId).not('parent_child_links.verified_at', 'is', null).limit(1),
  ]);
  const viewerJunior = who.get(viewerId)?.junior ?? false;
  const subjectJunior = who.get(subjectId)?.junior ?? false;
  const mineIds = new Set((mine ?? []).map((m) => m.club_id as string));
  const shared = (theirs ?? []).filter((t) => mineIds.has(t.club_id as string));
  // The adult in the pair is the one whose role counts
  const adultRows = (viewerJunior ? theirs : mine) ?? [];
  const sharedIds = new Set(shared.map((s) => s.club_id as string));
  const staff = adultRows.some((r) => sharedIds.has(r.club_id as string) && (r.role === 'coach' || r.role === 'club_admin'));
  return { viewerJunior, subjectJunior, sharesClub: shared.length > 0, adultIsStaffOfSharedClub: staff, isLinkedParent: (link ?? []).length > 0 };
}

// ── Follow ──────────────────────────────────────────────────────────────────────────────────────

export type FollowState = { following: boolean; canFollow: boolean };

export async function followState(userId: string, subject: 'player' | 'club', subjectId: string): Promise<FollowState> {
  const admin = createAdminClient();
  const { data } = await admin.from('community_follows').select('follower_id').eq('follower_id', userId).eq('subject_type', subject).eq('subject_id', subjectId).maybeSingle();
  if (subject === 'player' && subjectId === userId) return { following: false, canFollow: false };
  const ctx = subject === 'player' ? await crossBand(admin, userId, subjectId) : { viewerJunior: false, subjectJunior: false, sharesClub: true, adultIsStaffOfSharedClub: false, isLinkedParent: false };
  return { following: !!data, canFollow: mayFollow(subject, ctx) };
}

export async function setFollow(userId: string, subject: unknown, subjectId: unknown, on: boolean): Promise<Result<{ following: boolean }>> {
  if ((subject !== 'player' && subject !== 'club') || typeof subjectId !== 'string') return no('Nothing to follow.');
  if (subject === 'player' && subjectId === userId) return no('That is you.');
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  if (!on) {
    await admin.from('community_follows').delete().eq('follower_id', userId).eq('subject_type', subject).eq('subject_id', subjectId);
    return ok({ following: false });
  }
  const [blocked, state] = await Promise.all([blockedIds(admin, userId), followState(userId, subject, subjectId)]);
  if (subject === 'player' && blocked.has(subjectId)) return no('Person not found.');
  // Enforced here, never only by hiding the button
  if (!state.canFollow) return no('You cannot follow this person.');
  const { error } = await admin.from('community_follows').upsert({ follower_id: userId, subject_type: subject, subject_id: subjectId });
  if (error) return no('Could not follow.');
  return ok({ following: true });
}

export async function followCounts(subject: 'player' | 'club', subjectId: string): Promise<number> {
  const { count } = await createAdminClient().from('community_follows').select('follower_id', { count: 'exact', head: true }).eq('subject_type', subject).eq('subject_id', subjectId);
  return count ?? 0;
}

// ── Viewing a person across the age line ────────────────────────────────────────────────────────

export async function mayOpenProfile(admin: Admin, viewerId: string, subjectId: string): Promise<boolean> {
  if (viewerId === subjectId) return true;
  return mayViewProfile(await crossBand(admin, viewerId, subjectId));
}

// ── Club profile ────────────────────────────────────────────────────────────────────────────────

export type ClubProfile = {
  id: string; name: string; county: string | null; league: string | null; distance: string | null;
  headline: string; about: string; netsNotes: string; followers: number; following: boolean; mine: boolean; canEdit: boolean; members: number;
};

export async function getClubProfile(userId: string, clubId: string): Promise<Result<ClubProfile>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const [{ data: club }, { data: row }, viewer, followers, { count }, state, adminRow] = await Promise.all([
    admin.from('clubs').select('id, name, county, league, ground_lat, ground_lng').eq('id', clubId).maybeSingle(),
    admin.from('community_club_profiles').select('headline, about, nets_notes').eq('club_id', clubId).maybeSingle(),
    getViewer(admin, userId),
    followCounts('club', clubId),
    admin.from('club_members').select('user_id', { count: 'exact', head: true }).eq('club_id', clubId).eq('is_active', true),
    followState(userId, 'club', clubId),
    admin.from('club_members').select('role').eq('club_id', clubId).eq('user_id', userId).eq('is_active', true).maybeSingle(),
  ]);
  if (!club) return no('Club not found.');
  const home = viewer.club;
  const miles = home?.ground_lat != null && home.ground_lng != null && club.ground_lat != null && club.ground_lng != null
    ? milesBetween({ lat: home.ground_lat, lng: home.ground_lng }, { lat: club.ground_lat as number, lng: club.ground_lng as number }) : null;
  const own = viewer.clubIds.includes(clubId);
  return ok({
    id: club.id as string, name: club.name as string, county: (club.county as string | null) ?? null, league: (club.league as string | null) ?? null,
    // The club's own public ground, rounded to a whole mile
    distance: !own && miles !== null ? roughDistance(miles) : null,
    headline: (row?.headline as string | null) ?? '', about: (row?.about as string | null) ?? '', netsNotes: (row?.nets_notes as string | null) ?? '',
    followers, following: state.following, mine: own, canEdit: adminRow.data?.role === 'club_admin', members: count ?? 0,
  });
}

export async function saveClubProfile(userId: string, clubId: string, input: unknown): Promise<Result<Posted>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const { data: m } = await admin.from('club_members').select('role').eq('club_id', clubId).eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (m?.role !== 'club_admin') return no('Only a club admin can edit the club profile.');
  const v = (input ?? {}) as Record<string, unknown>;
  const clean = (x: unknown, n: number) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
  const headline = clean(v.headline, 80); const about = clean(v.about, 600); const nets = clean(v.netsNotes, 300);
  const text = [headline, about, nets].filter(Boolean).join('\n');
  if (text) {
    const check = await checkContent(text, { place: 'public', authorJunior: false, readerJunior: true }, 1000);
    if (check.status === 'held') return ok({ status: 'held', tell: check.tell });
  }
  const { error } = await admin.from('community_club_profiles').upsert({ club_id: clubId, headline: headline || null, about: about || null, nets_notes: nets || null, updated_at: new Date().toISOString() });
  if (error) return no('Could not save the club profile.');
  return ok({ status: 'live', tell: null });
}

// ── Parent oversight ────────────────────────────────────────────────────────────────────────────

export type ChildOversight = {
  childId: string; name: string; linkedUserId: string | null;
  profile: { headline: string; about: string; lookingFor: string[] } | null;
  connections: Array<{ id: string; name: string; state: 'connected' | 'requested' | 'incoming' }>;
  following: Array<{ type: 'player' | 'club'; id: string; name: string }>;
  posts: Array<{ id: string; body: string; createdAt: string }>;
};

/** Each child the parent is linked to. A child with no linked account has nothing in Community yet. */
export async function getChildrenOversight(parentId: string): Promise<Result<ChildOversight[]>> {
  const admin = createAdminClient();
  // Only a parent a club has verified can see into a child's Community
  const { data: links } = await admin.from('parent_child_links').select('child_profiles ( id, first_name, linked_user_id )').eq('parent_id', parentId).not('verified_at', 'is', null);
  const kids = (links ?? []).flatMap((l) => {
    const c = (Array.isArray(l.child_profiles) ? l.child_profiles[0] : l.child_profiles) as { id: string; first_name: string; linked_user_id: string | null } | null;
    return c ? [c] : [];
  });
  const out: ChildOversight[] = [];
  for (const k of kids) {
    const uid = k.linked_user_id;
    if (!uid) { out.push({ childId: k.id, name: k.first_name, linkedUserId: null, profile: null, connections: [], following: [], posts: [] }); continue; }
    const [{ data: prof }, { data: conns }, { data: follows }] = await Promise.all([
      admin.from('community_profiles').select('headline, about, looking_for').eq('user_id', uid).maybeSingle(),
      admin.from('community_connections').select('id, requester_id, addressee_id, status').or(`requester_id.eq.${uid},addressee_id.eq.${uid}`).in('status', ['pending', 'awaiting_parents', 'accepted']),
      admin.from('community_follows').select('subject_type, subject_id').eq('follower_id', uid),
    ]);
    const otherIds = (conns ?? []).map((c) => (c.requester_id === uid ? c.addressee_id : c.requester_id) as string);
    const who = await people(admin, otherIds);
    const clubIds = (follows ?? []).filter((f) => f.subject_type === 'club').map((f) => f.subject_id as string);
    const playerIds = (follows ?? []).filter((f) => f.subject_type === 'player').map((f) => f.subject_id as string);
    const [{ data: clubs }, folks] = await Promise.all([
      clubIds.length ? admin.from('clubs').select('id, name').in('id', clubIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      people(admin, playerIds),
    ]);
    const posts = await liveRecentPostsBy(uid);
    out.push({
      childId: k.id, name: k.first_name, linkedUserId: uid, posts,
      // Names of other juniors are first names only, as everywhere else
      profile: prof ? { headline: (prof.headline as string | null) ?? '', about: (prof.about as string | null) ?? '', lookingFor: (prof.looking_for as string[] | null) ?? [] } : { headline: '', about: '', lookingFor: [] },
      connections: (conns ?? []).map((c) => ({
        id: c.id as string, name: who.get((c.requester_id === uid ? c.addressee_id : c.requester_id) as string)?.name ?? 'Member',
        state: c.status === 'accepted' ? 'connected' as const : c.requester_id === uid ? 'requested' as const : 'incoming' as const,
      })),
      following: [
        ...(clubs ?? []).map((c) => ({ type: 'club' as const, id: c.id as string, name: c.name as string })),
        ...playerIds.map((id) => ({ type: 'player' as const, id, name: folks.get(id)?.name ?? 'Member' })),
      ],
    });
  }
  return ok(out);
}

/** The junior's account id, only if this parent is linked to that child and a club has verified the link. */
async function childAccount(admin: Admin, parentId: string, childId: string): Promise<string | null> {
  const { data } = await admin.from('parent_child_links').select('child_profiles ( linked_user_id )').eq('parent_id', parentId).eq('child_id', childId).not('verified_at', 'is', null).maybeSingle();
  const c = (data ? (Array.isArray(data.child_profiles) ? data.child_profiles[0] : data.child_profiles) : null) as { linked_user_id: string | null } | null;
  return c?.linked_user_id ?? null;
}

/** A parent cancels a pending request from their child's account. */
export async function parentCancelRequest(parentId: string, childId: string, connectionId: string): Promise<Result<{ cancelled: true }>> {
  const admin = createAdminClient();
  const uid = await childAccount(admin, parentId, childId);
  if (!uid) return no('Child not found.');
  const c = await admin.from('community_connections').select('id, requester_id, addressee_id, status').eq('id', connectionId).maybeSingle();
  if (!c.data || (c.data.status !== 'pending' && c.data.status !== 'awaiting_parents') || (c.data.requester_id !== uid && c.data.addressee_id !== uid)) return no('Request not found.');
  await admin.from('community_connections').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', connectionId);
  return ok({ cancelled: true });
}

/** A parent blocks someone on their child's behalf. */
export async function parentBlock(parentId: string, childId: string, otherId: unknown): Promise<Result<{ blocked: true }>> {
  if (typeof otherId !== 'string') return no('Person not found.');
  const admin = createAdminClient();
  const uid = await childAccount(admin, parentId, childId);
  if (!uid || uid === otherId) return no('Child not found.');
  const { error } = await admin.from('community_blocks').upsert({ blocker_id: uid, blocked_id: otherId });
  if (error) return no('Could not block this person.');
  // Any open connection is closed too
  const existing = await connectionBetween(admin, uid, otherId);
  if (existing) await admin.from('community_connections').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', existing.id);
  return ok({ blocked: true });
}

/** A parent reports something on their child's behalf. */
export async function parentReport(parentId: string, childId: string, input: unknown): Promise<Result<{ sent: true }>> {
  const admin = createAdminClient();
  const uid = await childAccount(admin, parentId, childId);
  if (!uid) return no('Child not found.');
  const v = (input ?? {}) as Record<string, unknown>;
  if (!(REPORT_KINDS as readonly string[]).includes(v.kind as string) || typeof v.targetId !== 'string') return no('Nothing to report.');
  if (v.kind === 'session' || v.kind === 'shortage') {
    const { data: target } = await admin.from(v.kind === 'session' ? 'community_sessions' : 'community_shortages').select('id').eq('id', v.targetId).maybeSingle();
    if (!target) return no('Nothing to report.');
  }
  const reportId = randomUUID();
  const { error } = await admin.from('community_reports').insert({ id: reportId, reporter_id: parentId, kind: v.kind, target_id: v.targetId, reason: `Reported by a parent: ${typeof v.reason === 'string' ? v.reason.trim().slice(0, 450) : ''}` });
  if (error) return no('Could not send your report.');
  // A parent reporting is about their child's world, so it is treated as a junior item
  await raiseAlert(admin, { source: 'report', kind: v.kind as string, targetId: v.targetId, reportId, reason: null, junior: true });
  return ok({ sent: true });
}

/** A profile, only if the viewer may see it across the age line. Anything else looks like "not found". */
export async function getProfileGuarded(viewerId: string, subjectId: string) {
  const { getProfile } = await import('./service');
  const admin = createAdminClient();
  if (!(await mayOpenProfile(admin, viewerId, subjectId))) return no('Profile not found.');
  return getProfile(viewerId, subjectId);
}
