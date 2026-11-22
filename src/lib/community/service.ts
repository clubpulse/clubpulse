// The Community's server side: who a person is here, their feed, their profile, who is nearby,
// connecting and private messages. Every table is behind the service-role client; the rules
// about who may see and message whom are applied in this file and in rules.ts.

import { createAdminClient } from '@/lib/supabase/admin';
import { awardScores } from '@/lib/scores/context';
import { ukToday } from '@/lib/utils/uk-date';
import { checkContent } from './moderation';
import {
  LOOKING_FOR, MAX_COMMENT, MAX_MESSAGE, MAX_POST, NEAR_MILES, mayMessage, matchesFilters, milesBetween, roughDistance, shownName,
  isAvailability, isStandard,
  type Availability, type ConnectFilters, type LookingFor, type Scope, type Standard,
} from './rules';
import { notify } from './notify';
import { ageStatus, type AgeStatus } from './age';

export type Admin = ReturnType<typeof createAdminClient>;
export type Result<T> = { success: true; data: T } | { success: false; error: string };
export const ok = <T>(data: T): Result<T> => ({ success: true, data });
export const no = (error: string): Result<never> => ({ success: false, error });

/** The Community is switched on with COMMUNITY_ENABLED=true, once its tables exist. */
export const communityOpen = () => process.env.COMMUNITY_ENABLED === 'true';

/**
 * Private messages involving anyone under 18 are off until messages are checked as they are sent. They are switched on
 * only with COMMUNITY_JUNIOR_DMS=true, which should not be set until that moderation exists and the safeguarding lead agrees.
 */
export const juniorMessagingOpen = () => communityOpen() && process.env.COMMUNITY_JUNIOR_DMS === 'true';
export const JUNIOR_DMS_OFF = 'Private messages are not available for under-18s yet.';

type ClubRow = { id: string; name: string; county: string | null; league: string | null; ground_lat: number | null; ground_lng: number | null };

export type Viewer = {
  userId: string; junior: boolean; club: ClubRow | null; clubIds: string[];
  /** needs_dob and pending_parent keep a person out of the Community; hold says why */
  status: AgeStatus; hold: string | null;
};

/** Who is asking: their clubs, whether they are under 18, and whether the Community is open to them yet. */
export async function getViewer(admin: Admin, userId: string): Promise<Viewer> {
  const [{ data: rows }, { data: profileRows }, parents] = await Promise.all([
    admin.from('club_members').select('club_id, is_junior, is_active, joined_at').eq('user_id', userId).eq('is_active', true).order('joined_at'),
    admin.from('profiles').select('date_of_birth').eq('id', userId).limit(1),
    parentsOf(admin, userId),
  ]);
  const mine = rows ?? [];
  const profile = (profileRows ?? [])[0] as { date_of_birth?: string | null } | undefined;
  const age = ageStatus({
    clubJunior: mine.length > 0 && mine.every((m) => m.is_junior === true),
    dob: (profile?.date_of_birth as string | null | undefined) ?? null,
    hasVerifiedParent: parents.length > 0,
  });
  // Shut out, a person has no clubs as far as the Community is concerned, so nothing that starts from their
  // clubs can show them anyone. The explicit checks on each action give the reason.
  const clubIds = age.cleared ? [...new Set(mine.map((m) => m.club_id as string))] : [];
  let club: ClubRow | null = null;
  if (clubIds.length > 0) {
    const { data } = await admin.from('clubs').select('id, name, county, league, ground_lat, ground_lng').eq('id', clubIds[0]).maybeSingle();
    club = (data as ClubRow | null) ?? null;
  }
  return { userId, junior: age.junior, club, clubIds, status: age.status, hold: age.hold };
}

/** The reason the Community is closed to this person, or null when it is open. */
export async function holdFor(admin: Admin, userId: string): Promise<string | null> {
  return (await getViewer(admin, userId)).hold;
}

/** The clubs a scope covers, with how far each is from the viewer's own ground where known. */
export async function clubsInScope(admin: Admin, viewer: Viewer, scope: Scope): Promise<Map<string, { name: string; miles: number | null }> | 'all'> {
  if (scope === 'all') return 'all';
  const { data } = await admin.from('clubs').select('id, name, county, league, ground_lat, ground_lng');
  const clubs = (data ?? []) as ClubRow[];
  const home = viewer.club;
  const here = home?.ground_lat != null && home.ground_lng != null ? { lat: home.ground_lat, lng: home.ground_lng } : null;
  const out = new Map<string, { name: string; miles: number | null }>();
  for (const c of clubs) {
    const miles = here && c.ground_lat != null && c.ground_lng != null ? milesBetween(here, { lat: c.ground_lat, lng: c.ground_lng }) : null;
    const own = viewer.clubIds.includes(c.id);
    const inScope =
      scope === 'club' ? own :
      scope === 'miles' ? own || (miles !== null && miles <= NEAR_MILES) :
      scope === 'league' ? own || (!!home?.league && c.league === home.league) :
      /* county */ own || (!!home?.county && c.county === home.county);
    if (inScope) out.set(c.id, { name: c.name, miles: own ? 0 : miles });
  }
  return out;
}

export async function blockedIds(admin: Admin, userId: string): Promise<Set<string>> {
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    admin.from('community_blocks').select('blocked_id').eq('blocker_id', userId),
    admin.from('community_blocks').select('blocker_id').eq('blocked_id', userId),
  ]);
  return new Set([...(mine ?? []).map((r) => r.blocked_id as string), ...(theirs ?? []).map((r) => r.blocker_id as string)]);
}

export type Person = { id: string; name: string; junior: boolean; cleared: boolean; hold: string | null; clubId: string | null; clubName: string | null; roles: string[] };

/** Names, clubs and roles for a set of people, with juniors shown by first name only. */
export async function people(admin: Admin, ids: string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids)];
  const out = new Map<string, Person>();
  if (unique.length === 0) return out;
  const [{ data: profiles }, { data: members }, { data: linked }] = await Promise.all([
    admin.from('profiles').select('id, full_name, display_name, date_of_birth').in('id', unique),
    admin.from('club_members').select('user_id, club_id, role, is_junior, is_active').in('user_id', unique).eq('is_active', true),
    admin.from('child_profiles').select('linked_user_id, parent_child_links!inner ( verified_at )').in('linked_user_id', unique).not('parent_child_links.verified_at', 'is', null),
  ]);
  const withParent = new Set((linked ?? []).map((r) => r.linked_user_id as string));
  const clubIds = [...new Set((members ?? []).map((m) => m.club_id as string))];
  const { data: clubs } = clubIds.length ? await admin.from('clubs').select('id, name').in('id', clubIds) : { data: [] as Array<{ id: string; name: string }> };
  const clubName = new Map((clubs ?? []).map((c) => [c.id as string, c.name as string]));
  for (const id of unique) {
    const rows = (members ?? []).filter((m) => m.user_id === id);
    const profile = (profiles ?? []).find((p) => p.id === id);
    // The same rule as getViewer: a club admin's mark or a date of birth under 18 makes someone a junior
    const age = ageStatus({
      clubJunior: rows.length > 0 && rows.every((m) => m.is_junior === true),
      dob: (profile?.date_of_birth as string | null | undefined) ?? null,
      hasVerifiedParent: withParent.has(id),
    });
    const junior = age.junior;
    const clubId = (rows[0]?.club_id as string | undefined) ?? null;
    out.set(id, {
      id, junior, cleared: age.cleared, hold: age.hold, clubId,
      name: shownName((profile?.display_name as string | null) || (profile?.full_name as string | null), junior),
      clubName: clubId ? clubName.get(clubId) ?? null : null,
      roles: [...new Set(rows.map((m) => (m.role === 'member' ? 'player' : (m.role as string))))],
    });
  }
  return out;
}

// ── Juniors' words stay inside the age line ─────────────────────────────────────────────────────

/**
 * Of these authors, the ones whose posts and comments this viewer may see. Adults' words are open to
 * all (the usual scope and block rules still apply); a junior's only to those who may open that junior's
 * profile: other juniors, the linked parent, a coach or admin of a shared club. Computed once per
 * distinct junior, and the author always sees their own.
 */
export async function visibleAuthors(admin: Admin, viewerId: string, authorIds: string[], who?: Map<string, Person>): Promise<Set<string>> {
  const ids = [...new Set(authorIds)];
  const known = who ?? await people(admin, ids);
  const allowed = new Set<string>();
  const juniors: string[] = [];
  for (const id of ids) {
    // Someone the Community is shut to (no date of birth, or a child with no verified parent) is not shown to others
    if (id !== viewerId && known.get(id) && !known.get(id)!.cleared) continue;
    if (id === viewerId || !known.get(id)?.junior) allowed.add(id);
    else juniors.push(id);
  }
  if (juniors.length) {
    const { mayOpenProfile } = await import('./social'); // social imports this file, so load it when needed
    const verdicts = await Promise.all(juniors.map((id) => mayOpenProfile(admin, viewerId, id)));
    juniors.forEach((id, i) => { if (verdicts[i]) allowed.add(id); });
  }
  return allowed;
}

// ── Feed ────────────────────────────────────────────────────────────────────────────────────────

export type FeedPost = {
  id: string; body: string; createdAt: string; mine: boolean; held: boolean;
  author: { id: string; name: string; club: string | null; junior: boolean };
  likes: number; liked: boolean; comments: number;
};

export async function getFeed(userId: string, scope: Scope): Promise<Result<{ scope: Scope; posts: FeedPost[]; canFilter: { miles: boolean; league: boolean; county: boolean } }>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  const clubs = await clubsInScope(admin, viewer, scope);

  let query = admin.from('community_posts').select('id, author_id, club_id, body, status, created_at').order('created_at', { ascending: false }).limit(60);
  // A person always sees their own posts, including ones being held
  query = clubs === 'all'
    ? query.or(`status.eq.live,author_id.eq.${userId}`)
    : query.or(`and(status.eq.live,club_id.in.(${[...clubs.keys()].join(',') || '00000000-0000-0000-0000-000000000000'})),author_id.eq.${userId}`);
  const { data, error } = await query;
  if (error) return no('Could not load the feed.');

  const blocked = await blockedIds(admin, userId);
  const unblocked = (data ?? []).filter((p) => !blocked.has(p.author_id as string) && p.status !== 'removed');
  const who = await people(admin, unblocked.map((p) => p.author_id as string));
  const seen = await visibleAuthors(admin, userId, unblocked.map((p) => p.author_id as string), who);
  const rows = unblocked.filter((p) => seen.has(p.author_id as string));
  const ids = rows.map((p) => p.id as string);
  const [{ data: likes }, { data: comments }] = await Promise.all([
    ids.length ? admin.from('community_post_likes').select('post_id, user_id').in('post_id', ids) : Promise.resolve({ data: [] as Array<{ post_id: string; user_id: string }> }),
    ids.length ? admin.from('community_comments').select('post_id').in('post_id', ids).eq('status', 'live') : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
  ]);

  const home = viewer.club;
  return ok({
    scope,
    canFilter: { miles: home?.ground_lat != null && home?.ground_lng != null, league: !!home?.league, county: !!home?.county },
    posts: rows.map((p) => {
      const author = who.get(p.author_id as string);
      return {
        id: p.id as string, body: p.body as string, createdAt: p.created_at as string,
        mine: p.author_id === userId, held: p.status === 'held',
        author: { id: p.author_id as string, name: author?.name ?? 'Member', club: author?.clubName ?? null, junior: author?.junior ?? false },
        likes: (likes ?? []).filter((l) => l.post_id === p.id).length,
        liked: (likes ?? []).some((l) => l.post_id === p.id && l.user_id === userId),
        comments: (comments ?? []).filter((c) => c.post_id === p.id).length,
      };
    }),
  });
}

/** What the writer is told after posting: it is live, or why it was not posted. */
export type Posted = { status: 'live' | 'held'; tell: string | null };

export async function createPost(userId: string, body: unknown): Promise<Result<Posted>> {
  if (typeof body !== 'string') return no('Write something first.');
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  if (viewer.clubIds.length === 0) return no('Join a club before posting.');

  const check = await checkContent(body, { place: 'public', authorJunior: viewer.junior, readerJunior: true }, MAX_POST);
  // Text that broke a written rule is not kept at all; text the AI stopped is kept for SHIFTUP to review
  if (check.status === 'held' && !check.held) return ok({ status: 'held', tell: check.tell });
  const { error } = await admin.from('community_posts').insert({
    author_id: userId, club_id: viewer.club?.id ?? null, body: body.trim(),
    status: check.status, held_reason: check.status === 'held' ? check.tell : null,
  });
  if (error) return no('Could not save your post.');
  // Scores only for a post that went live, once a day. A held post pays nothing.
  if (check.status === 'live' && viewer.club) await awardScores(userId, viewer.club.id, 'community_post', `day:${ukToday()}`).catch(() => undefined);
  return ok({ status: check.status, tell: check.status === 'held' ? check.tell : null });
}

export async function toggleLike(userId: string, postId: string): Promise<Result<{ liked: boolean }>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const { data: post } = await admin.from('community_posts').select('id, author_id').eq('id', postId).eq('status', 'live').maybeSingle();
  if (!post || !(await visibleAuthors(admin, userId, [post.author_id as string])).has(post.author_id as string)) return no('Post not found.');
  const { data: existing } = await admin.from('community_post_likes').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (existing) {
    await admin.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    return ok({ liked: false });
  }
  await admin.from('community_post_likes').insert({ post_id: postId, user_id: userId });
  return ok({ liked: true });
}

export type Comment = { id: string; body: string; createdAt: string; mine: boolean; author: { id: string; name: string } };

export async function getComments(userId: string, postId: string): Promise<Result<Comment[]>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const { data: post } = await admin.from('community_posts').select('id, author_id').eq('id', postId).eq('status', 'live').maybeSingle();
  if (!post || !(await visibleAuthors(admin, userId, [post.author_id as string])).has(post.author_id as string)) return no('Post not found.');
  const { data } = await admin.from('community_comments').select('id, author_id, body, created_at').eq('post_id', postId).eq('status', 'live').order('created_at').limit(100);
  const blocked = await blockedIds(admin, userId);
  const unblocked = (data ?? []).filter((c) => !blocked.has(c.author_id as string));
  const who = await people(admin, unblocked.map((c) => c.author_id as string));
  const seen = await visibleAuthors(admin, userId, unblocked.map((c) => c.author_id as string), who);
  const rows = unblocked.filter((c) => seen.has(c.author_id as string));
  return ok(rows.map((c) => ({
    id: c.id as string, body: c.body as string, createdAt: c.created_at as string, mine: c.author_id === userId,
    author: { id: c.author_id as string, name: who.get(c.author_id as string)?.name ?? 'Member' },
  })));
}

export async function addComment(userId: string, postId: string, body: unknown): Promise<Result<Posted>> {
  if (typeof body !== 'string') return no('Write something first.');
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const { data: post } = await admin.from('community_posts').select('id, author_id').eq('id', postId).eq('status', 'live').maybeSingle();
  if (!post || !(await visibleAuthors(admin, userId, [post.author_id as string])).has(post.author_id as string)) return no('Post not found.');
  const viewer = await getViewer(admin, userId);
  const check = await checkContent(body, { place: 'public', authorJunior: viewer.junior, readerJunior: true }, MAX_COMMENT);
  if (check.status === 'held' && !check.held) return ok({ status: 'held', tell: check.tell });
  const { error } = await admin.from('community_comments').insert({
    post_id: postId, author_id: userId, body: body.trim(), status: check.status, held_reason: check.status === 'held' ? check.tell : null,
  });
  if (error) return no('Could not save your reply.');
  return ok({ status: check.status, tell: check.status === 'held' ? check.tell : null });
}

// ── Profile ─────────────────────────────────────────────────────────────────────────────────────

export type CommunityProfile = {
  id: string; name: string; junior: boolean; club: string | null; roles: string[];
  headline: string; about: string; lookingFor: LookingFor[]; openToClub: boolean; standard: Standard | null; availability: Availability[];
  connections: number; mine: boolean;
  /** How this person relates to the viewer */
  link: 'self' | 'none' | 'requested' | 'incoming' | 'connected' | 'awaiting_parents';
  connectionId: string | null;
};

export async function connectionBetween(admin: Admin, a: string, b: string) {
  const { data } = await admin.from('community_connections').select('id, requester_id, addressee_id, status')
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`).limit(1);
  return (data ?? [])[0] as { id: string; requester_id: string; addressee_id: string; status: string } | undefined;
}

export async function getProfile(userId: string, targetId: string): Promise<Result<CommunityProfile>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const [who, { data: row }, { count }, link, blocked] = await Promise.all([
    people(admin, [targetId]),
    admin.from('community_profiles').select('headline, about, looking_for, open_to_club, standard, availability').eq('user_id', targetId).maybeSingle(),
    admin.from('community_connections').select('id', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${targetId},addressee_id.eq.${targetId}`),
    targetId === userId ? Promise.resolve(undefined) : connectionBetween(admin, userId, targetId),
    blockedIds(admin, userId),
  ]);
  const person = who.get(targetId);
  if (!person || blocked.has(targetId)) return no('Profile not found.');
  const mine = targetId === userId;
  if (!mine && !person.cleared) return no('Profile not found.');
  return ok({
    id: targetId, name: person.name, junior: person.junior, club: person.clubName, roles: person.roles,
    headline: (row?.headline as string | null) ?? '', about: (row?.about as string | null) ?? '',
    lookingFor: ((row?.looking_for as string[] | null) ?? []).filter((v): v is LookingFor => (LOOKING_FOR as readonly string[]).includes(v)),
    openToClub: row?.open_to_club === true,
    standard: isStandard(row?.standard) ? row.standard : null,
    availability: ((row?.availability as string[] | null) ?? []).filter(isAvailability),
    connections: count ?? 0, mine,
    link: mine ? 'self' : !link || link.status === 'declined' ? 'none' : link.status === 'accepted' ? 'connected' : link.status === 'awaiting_parents' ? 'awaiting_parents' : link.requester_id === userId ? 'requested' : 'incoming',
    connectionId: link?.status === 'accepted' ? link.id : null,
  });
}

export async function saveProfile(userId: string, input: unknown): Promise<Result<Posted>> {
  const v = (input ?? {}) as Record<string, unknown>;
  const headline = typeof v.headline === 'string' ? v.headline.trim().slice(0, 80) : '';
  const about = typeof v.about === 'string' ? v.about.trim().slice(0, 400) : '';
  const lookingFor = Array.isArray(v.lookingFor) ? v.lookingFor.filter((x): x is LookingFor => (LOOKING_FOR as readonly string[]).includes(x as string)) : [];
  const standard = isStandard(v.standard) ? v.standard : null;
  const availability = Array.isArray(v.availability) ? v.availability.filter(isAvailability) : [];
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  // A profile is public, so its words are checked the same way a post is
  const text = [headline, about].filter(Boolean).join('\n');
  if (text) {
    const check = await checkContent(text, { place: 'public', authorJunior: viewer.junior, readerJunior: true }, 500);
    if (check.status === 'held') return ok({ status: 'held', tell: check.tell });
  }
  const { error } = await admin.from('community_profiles').upsert({
    user_id: userId, headline: headline || null, about: about || null, looking_for: lookingFor, open_to_club: v.openToClub === true, standard, availability, updated_at: new Date().toISOString(),
  });
  if (error) return no('Could not save your profile.');
  return ok({ status: 'live', tell: null });
}

// ── Nearby and connecting ───────────────────────────────────────────────────────────────────────

export type NearbyPerson = { id: string; name: string; club: string | null; roles: string[]; distance: string | null; headline: string; lookingFor: LookingFor[]; openToClub: boolean; standard: Standard | null; availability: Availability[] };

export async function getNearby(userId: string, scope: Scope, want: LookingFor | null, filters: ConnectFilters = {}): Promise<Result<{ scope: Scope; people: NearbyPerson[]; notice: string | null }>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  if (viewer.clubIds.length === 0) return ok({ scope, people: [], notice: null });
  const clubs = await clubsInScope(admin, viewer, scope);

  let members = admin.from('club_members').select('user_id, club_id, is_junior').eq('is_active', true).neq('user_id', userId).limit(400);
  if (clubs !== 'all') members = members.in('club_id', [...clubs.keys()]);
  const [{ data: rows }, blocked, { data: sent }, { data: got }, { data: passed }] = await Promise.all([
    members,
    blockedIds(admin, userId),
    admin.from('community_connections').select('addressee_id').eq('requester_id', userId),
    admin.from('community_connections').select('requester_id, status').eq('addressee_id', userId),
    admin.from('community_passes').select('other_id').eq('user_id', userId),
  ]);
  const skip = new Set<string>([
    ...blocked, ...(sent ?? []).map((r) => r.addressee_id as string),
    ...(got ?? []).filter((r) => r.status !== 'pending').map((r) => r.requester_id as string),
    ...(passed ?? []).map((r) => r.other_id as string),
  ]);
  const ids = [...new Set((rows ?? []).map((r) => r.user_id as string))].filter((id) => !skip.has(id));
  const who = await people(admin, ids);
  // Juniors meet juniors and adults meet adults: nobody under 18 is shown to an adult here
  const shown = ids.map((id) => who.get(id)!).filter((p) => p && p.cleared && p.junior === viewer.junior);
  const { data: profiles } = shown.length ? await admin.from('community_profiles').select('user_id, headline, looking_for, open_to_club, standard, availability').in('user_id', shown.map((p) => p.id)) : { data: [] as Array<Record<string, unknown>> };

  const list = shown.map((p) => {
    const profile = (profiles ?? []).find((r) => r.user_id === p.id);
    const miles = clubs !== 'all' && p.clubId ? clubs.get(p.clubId)?.miles ?? null : null;
    return {
      id: p.id, name: p.name, club: p.clubName, roles: p.roles,
      // A junior's distance is never shown, and nobody's is finer than a mile
      distance: !p.junior && miles !== null && miles > 0 ? roughDistance(miles) : null,
      headline: (profile?.headline as string | null) ?? '',
      lookingFor: ((profile?.looking_for as string[] | null) ?? []).filter((x): x is LookingFor => (LOOKING_FOR as readonly string[]).includes(x)),
      openToClub: profile?.open_to_club === true,
      standard: isStandard(profile?.standard) ? profile.standard : null,
      availability: ((profile?.availability as string[] | null) ?? []).filter(isAvailability),
      miles,
    };
  }).filter((p) => !want || p.lookingFor.includes(want))
    .filter((p) => matchesFilters({ roles: p.roles, standard: p.standard, availability: p.availability, miles: p.miles }, filters))
    .map((p) => { const person: Partial<typeof p> = { ...p }; delete person.miles; return person as NearbyPerson; });
  // People who have filled in their profile come first
  list.sort((a, b) => Number(!!b.headline) - Number(!!a.headline));
  return ok({ scope, people: list.slice(0, 30), notice: null });
}

type ConnectionEvent = 'requested' | 'accepted' | 'declined' | 'passed' | 'parent_notified' | 'no_parent_to_notify';

async function logEvent(admin: Admin, e: { connectionId: string | null; actor: string; other: string; event: ConnectionEvent; bothJunior: boolean }) {
  // The audit trail is best effort; it never blocks the connection itself
  try { await admin.from('community_connection_events').insert({ connection_id: e.connectionId, actor_id: e.actor, other_id: e.other, event: e.event, both_junior: e.bothJunior }); } catch { /* ignore */ }
}

/** The verified parents of a junior's linked account. */
export async function parentsOf(admin: Admin, juniorUserId: string): Promise<string[]> {
  const { data } = await admin.from('child_profiles').select('parent_child_links!inner ( parent_id, verified_at )').eq('linked_user_id', juniorUserId).not('parent_child_links.verified_at', 'is', null);
  const links = (data ?? []).flatMap((r) => (Array.isArray(r.parent_child_links) ? r.parent_child_links : [r.parent_child_links]));
  return [...new Set(links.map((l) => (l as { parent_id: string }).parent_id))];
}

/** Say yes or "not now" to someone. Two yeses make a connection. */
export async function answerPerson(userId: string, otherId: string, yes: boolean): Promise<Result<{ link: 'requested' | 'connected' | 'passed' | 'awaiting_parents'; connectionId: string | null }>> {
  if (otherId === userId) return no('That is you.');
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const [who, blocked, existing] = await Promise.all([people(admin, [userId, otherId]), blockedIds(admin, userId), connectionBetween(admin, userId, otherId)]);
  const me = who.get(userId); const them = who.get(otherId);
  if (!me || !them || blocked.has(otherId) || !them.cleared) return no('Person not found.');
  if (!me.cleared) return no(me.hold ?? 'The Community is not open to you yet.');
  const bothJunior = me.junior && them.junior;

  if (!yes && me.junior !== them.junior && me.junior) {
    const g = await (await import('./guardian')).answerAsJunior(admin, userId, otherId, false);
    if (g) return g;
  }
  if (!yes) {
    await admin.from('community_passes').upsert({ user_id: userId, other_id: otherId });
    const declining = !!existing && existing.status === 'pending' && existing.addressee_id === userId;
    if (declining) await admin.from('community_connections').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', existing.id);
    await logEvent(admin, { connectionId: declining ? existing.id : null, actor: userId, other: otherId, event: declining ? 'declined' : 'passed', bothJunior });
    return ok({ link: 'passed', connectionId: null });
  }
  // An adult and someone under 18 connect only through a parent-approved contact, answered by the junior here
  if (!mayMessage(me.junior, them.junior)) {
    if (me.junior) {
      const g = await (await import('./guardian')).answerAsJunior(admin, userId, otherId, true);
      if (g) return g;
    }
    return no('Adults and under-18s cannot connect privately. Follow their posts on the feed instead.');
  }
  if (existing?.status === 'accepted') return ok({ link: 'connected', connectionId: existing.id });
  if (existing?.status === 'awaiting_parents') return ok({ link: 'awaiting_parents', connectionId: existing.id });
  if (existing && existing.status === 'pending' && existing.addressee_id === userId) {
    // Two juniors do not connect until a verified parent of each has approved. Both have now said yes, so the
    // connection waits and the parents are asked. Adults connect straight away.
    if (bothJunior) {
      const held = await (await import('./junior-approval')).startParentApproval(admin, existing.id, userId, userId, otherId);
      if (!held.success) return no(held.error);
      return ok({ link: 'awaiting_parents', connectionId: existing.id });
    }
    await admin.from('community_connections').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', existing.id);
    await logEvent(admin, { connectionId: existing.id, actor: userId, other: otherId, event: 'accepted', bothJunior });
    await notify(admin, otherId, { kind: 'connect_accepted', title: `${me.name} accepted`, body: 'You are connected. Say hello.', data: { connectionId: existing.id } });
    return ok({ link: 'connected', connectionId: existing.id });
  }
  if (existing && existing.requester_id === userId) return ok({ link: 'requested', connectionId: null });
  let connectionId: string | null = existing?.id ?? null;
  if (existing) {   // they asked before and were declined: a fresh yes from this side reopens it
    await admin.from('community_connections').update({ requester_id: userId, addressee_id: otherId, status: 'pending', responded_at: null }).eq('id', existing.id);
  } else {
    const { data, error } = await admin.from('community_connections').insert({ requester_id: userId, addressee_id: otherId }).select('id').maybeSingle();
    if (error) return no('Could not send your request.');
    connectionId = (data?.id as string | undefined) ?? null;
  }
  await logEvent(admin, { connectionId, actor: userId, other: otherId, event: 'requested', bothJunior });
  await notify(admin, otherId, { kind: 'connect_request', title: `${me.name} wants to connect`, body: me.clubName ?? undefined, data: connectionId ? { connectionId } : {} });
  return ok({ link: 'requested', connectionId: null });
}

// ── Clubs near you ──────────────────────────────────────────────────────────────────────────────

export type ClubCard = { id: string; name: string; county: string | null; league: string | null; distance: string | null; headline: string; netsNotes: string; following: boolean };

/** Clubs in range other than your own, for the club cards. Public club information only. */
export async function getNearbyClubs(userId: string, scope: Scope, within?: number): Promise<Result<{ clubs: ClubCard[] }>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  if (viewer.clubIds.length === 0) return ok({ clubs: [] });
  const inScope = await clubsInScope(admin, viewer, scope);
  const { data: rows } = await admin.from('clubs').select('id, name, county, league');
  const own = new Set(viewer.clubIds);
  const candidates = (rows ?? []).filter((c) => !own.has(c.id as string) && (inScope === 'all' || inScope.has(c.id as string)))
    .map((c) => ({ c, miles: inScope === 'all' ? null : inScope.get(c.id as string)?.miles ?? null }))
    .filter((x) => within === undefined || (x.miles !== null && x.miles <= within))
    .sort((a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9)).slice(0, 30);
  const ids = candidates.map((x) => x.c.id as string);
  const [{ data: profiles }, { data: follows }] = ids.length
    ? await Promise.all([
        admin.from('community_club_profiles').select('club_id, headline, nets_notes').in('club_id', ids),
        admin.from('community_follows').select('subject_id').eq('follower_id', userId).eq('subject_type', 'club').in('subject_id', ids),
      ])
    : [{ data: [] as Array<Record<string, unknown>> }, { data: [] as Array<Record<string, unknown>> }];
  const followed = new Set((follows ?? []).map((f) => f.subject_id as string));
  return ok({ clubs: candidates.map(({ c, miles }) => {
    const p = (profiles ?? []).find((r) => r.club_id === c.id);
    return {
      id: c.id as string, name: c.name as string, county: (c.county as string | null) ?? null, league: (c.league as string | null) ?? null,
      distance: miles !== null && miles > 0 ? roughDistance(miles) : null,
      headline: (p?.headline as string | null) ?? '', netsNotes: (p?.nets_notes as string | null) ?? '', following: followed.has(c.id as string),
    };
  }) });
}

export type ConnectionRow = { id: string; person: { id: string; name: string; club: string | null }; state: 'connected' | 'incoming' | 'requested' | 'awaiting_parents'; last: string | null };

export async function getConnections(userId: string): Promise<Result<ConnectionRow[]>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const { data } = await admin.from('community_connections').select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).in('status', ['pending', 'awaiting_parents', 'accepted']).order('created_at', { ascending: false }).limit(200);
  const blocked = await blockedIds(admin, userId);
  const rows = (data ?? []).map((c) => ({ c, other: (c.requester_id === userId ? c.addressee_id : c.requester_id) as string })).filter((r) => !blocked.has(r.other));
  const who = await people(admin, rows.map((r) => r.other));
  const accepted = rows.filter((r) => r.c.status === 'accepted').map((r) => r.c.id as string);
  const { data: messages } = accepted.length
    ? await admin.from('community_messages').select('connection_id, body, created_at').in('connection_id', accepted).eq('status', 'live').order('created_at', { ascending: false }).limit(300)
    : { data: [] as Array<{ connection_id: string; body: string }> };
  return ok(rows.map(({ c, other }) => ({
    id: c.id as string,
    person: { id: other, name: who.get(other)?.name ?? 'Member', club: who.get(other)?.clubName ?? null },
    state: c.status === 'accepted' ? 'connected' as const : c.status === 'awaiting_parents' ? 'awaiting_parents' as const : c.addressee_id === userId ? 'incoming' as const : 'requested' as const,
    last: (messages ?? []).find((m) => m.connection_id === c.id)?.body ?? null,
  })));
}

// ── Messages ────────────────────────────────────────────────────────────────────────────────────

async function openThread(admin: Admin, userId: string, connectionId: string) {
  const { data: c } = await admin.from('community_connections').select('id, requester_id, addressee_id, status').eq('id', connectionId).maybeSingle();
  if (!c || c.status !== 'accepted' || (c.requester_id !== userId && c.addressee_id !== userId)) return null;
  const other = (c.requester_id === userId ? c.addressee_id : c.requester_id) as string;
  const [who, blocked] = await Promise.all([people(admin, [userId, other]), blockedIds(admin, userId)]);
  const me = who.get(userId); const them = who.get(other);
  // Checked again on every read and send: someone's age band can change after they connected
  if (!me || !them || blocked.has(other) || !me.cleared || !them.cleared) return null;
  // Nothing private is sent to or from an under-18 while this is off, whatever the connection or contact says
  if ((me.junior || them.junior) && !juniorMessagingOpen()) return 'junior_off' as const;
  // An adult and a junior can talk only through a parent-approved contact that is still active
  if (!mayMessage(me.junior, them.junior) && !(await (await import('./guardian')).guardianContactActive(admin, userId, other))) return null;
  return { me, them };
}

export type Message = { id: string; body: string; createdAt: string; mine: boolean };

export async function getMessages(userId: string, connectionId: string): Promise<Result<{ person: { id: string; name: string; club: string | null }; messages: Message[] }>> {
  const admin = createAdminClient();
  const thread = await openThread(admin, userId, connectionId);
  if (thread === 'junior_off') return no(JUNIOR_DMS_OFF);
  if (!thread) return no('Conversation not found.');
  const { data } = await admin.from('community_messages').select('id, sender_id, body, created_at').eq('connection_id', connectionId).eq('status', 'live').order('created_at', { ascending: false }).limit(100);
  return ok({
    person: { id: thread.them.id, name: thread.them.name, club: thread.them.clubName },
    messages: (data ?? []).reverse().map((m) => ({ id: m.id as string, body: m.body as string, createdAt: m.created_at as string, mine: m.sender_id === userId })),
  });
}

export async function sendMessage(userId: string, connectionId: string, body: unknown): Promise<Result<Posted>> {
  if (typeof body !== 'string') return no('Write something first.');
  const admin = createAdminClient();
  const thread = await openThread(admin, userId, connectionId);
  if (thread === 'junior_off') return no(JUNIOR_DMS_OFF);
  if (!thread) return no('Conversation not found.');
  const check = await checkContent(body, { place: 'private', authorJunior: thread.me.junior, readerJunior: thread.them.junior }, MAX_MESSAGE);
  if (check.status === 'held' && !check.held) return ok({ status: 'held', tell: check.tell });
  const { error } = await admin.from('community_messages').insert({
    connection_id: connectionId, sender_id: userId, body: body.trim(), status: check.status, held_reason: check.status === 'held' ? check.tell : null,
  });
  if (error) return no('Could not send your message.');
  return ok({ status: check.status, tell: check.status === 'held' ? check.tell : null });
}

// ── Report and block ────────────────────────────────────────────────────────────────────────────

const KINDS = ['post', 'comment', 'message', 'profile'] as const;

export async function report(userId: string, input: unknown): Promise<Result<{ sent: true }>> {
  const v = (input ?? {}) as Record<string, unknown>;
  if (!(KINDS as readonly string[]).includes(v.kind as string) || typeof v.targetId !== 'string') return no('Nothing to report.');
  const admin = createAdminClient();
  const { error } = await admin.from('community_reports').insert({
    reporter_id: userId, kind: v.kind, target_id: v.targetId, reason: typeof v.reason === 'string' ? v.reason.trim().slice(0, 500) : null,
  });
  if (error) return no('Could not send your report.');
  return ok({ sent: true });
}

export async function block(userId: string, otherId: unknown): Promise<Result<{ blocked: true }>> {
  if (typeof otherId !== 'string' || otherId === userId) return no('Person not found.');
  const admin = createAdminClient();
  const { error } = await admin.from('community_blocks').upsert({ blocker_id: userId, blocked_id: otherId });
  if (error) return no('Could not block this person.');
  return ok({ blocked: true });
}
