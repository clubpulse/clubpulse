// Adult-to-junior contact, parent first. Off unless COMMUNITY_CROSSBAND_ENABLED is exactly "true" as well
// as COMMUNITY_ENABLED. An adult who coaches or runs a club the junior belongs to, and holds a current
// enhanced DBS check there, may ask. The junior's verified parent decides first; only then is the junior
// asked. An active contact is the only way an adult and a junior can exchange private messages, and the
// parent can read that conversation and end it at any time.

import { createAdminClient } from '@/lib/supabase/admin';
import { ukToday } from '@/lib/utils/uk-date';
import { checkContent } from './moderation';
import { notify } from './notify';
import { blockedIds, communityOpen, no, ok, parentsOf, people, type Admin, type Message, type Result } from './service';
import { GUARDIAN_COOLDOWN_DAYS, GUARDIAN_NOTE_MAX, GUARDIAN_PENDING_MAX, dbsIsCurrent, guardianBlock, type DbsRow } from './rules';

export const crossBandOpen = () => communityOpen() && process.env.COMMUNITY_CROSSBAND_ENABLED === 'true';

type Event = 'requested' | 'parent_approved' | 'parent_declined' | 'junior_accepted' | 'junior_declined' | 'withdrawn' | 'ended' | 'thread_read';
async function logEvent(admin: Admin, requestId: string | null, actor: string, event: Event) {
  try { await admin.from('community_guardian_events').insert({ request_id: requestId, actor_id: actor, event }); } catch { /* the audit trail never blocks the action */ }
}

type Eligibility = { ok: true; clubId: string } | { ok: false; reason: string };

/** Whether this adult may ask to connect with this junior, and through which shared club. */
export async function checkEligibility(admin: Admin, adultId: string, juniorId: string): Promise<Eligibility> {
  const who = await people(admin, [adultId, juniorId]);
  const adult = who.get(adultId); const junior = who.get(juniorId);
  if (!adult || !junior) return { ok: false, reason: 'Person not found.' };
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    admin.from('club_members').select('club_id, role').eq('user_id', adultId).eq('is_active', true),
    admin.from('club_members').select('club_id').eq('user_id', juniorId).eq('is_active', true),
  ]);
  const juniorClubs = new Set((theirs ?? []).map((r) => r.club_id as string));
  const sharedStaffClubs = (mine ?? []).filter((r) => (r.role === 'coach' || r.role === 'club_admin') && juniorClubs.has(r.club_id as string)).map((r) => r.club_id as string);
  let dbsClub: string | null = null;
  if (sharedStaffClubs.length) {
    const { data: dbs } = await admin.from('dbs_checks').select('club_id, check_type, status, expiry_date').eq('user_id', adultId).in('club_id', sharedStaffClubs);
    const today = ukToday();
    dbsClub = sharedStaffClubs.find((c) => dbsIsCurrent((dbs ?? []).filter((d) => d.club_id === c) as DbsRow[], today)) ?? null;
  }
  const parents = await parentsOf(admin, juniorId);
  const reason = guardianBlock({
    adultJunior: adult.junior, subjectJunior: junior.junior, staffOfSharedClub: sharedStaffClubs.length > 0, currentDbs: dbsClub !== null, juniorHasParent: parents.length > 0,
  });
  return reason ? { ok: false, reason } : { ok: true, clubId: dbsClub! };
}

export async function canAskJunior(adultId: string, juniorId: string): Promise<boolean> {
  if (!crossBandOpen()) return false;
  return (await checkEligibility(createAdminClient(), adultId, juniorId)).ok;
}

export async function requestJunior(adultId: string, juniorId: string, noteIn: unknown): Promise<Result<{ sent: true }>> {
  if (!crossBandOpen()) return no('This is not open yet.');
  if (adultId === juniorId) return no('That is you.');
  const admin = createAdminClient();
  if ((await blockedIds(admin, adultId)).has(juniorId)) return no('Person not found.');
  const e = await checkEligibility(admin, adultId, juniorId);
  if (!e.ok) return no(e.reason);
  const note = typeof noteIn === 'string' ? noteIn.trim().slice(0, GUARDIAN_NOTE_MAX) : '';
  if (note) {
    // The parent reads this, so it is checked as writing meant for a young person's family
    const check = await checkContent(note, { place: 'private', authorJunior: false, readerJunior: true }, GUARDIAN_NOTE_MAX);
    if (check.status === 'held') return no(check.tell ?? 'That note was not sent.');
  }
  // A parent who has said no is not asked again for a while
  const since = new Date(Date.now() - GUARDIAN_COOLDOWN_DAYS * 86400000).toISOString();
  const { data: recent } = await admin.from('community_guardian_requests').select('id').eq('adult_id', adultId).eq('junior_id', juniorId).eq('status', 'declined').gte('created_at', since).limit(1);
  if ((recent ?? []).length) return no('Their family has already replied to your request.');
  const { count } = await admin.from('community_guardian_requests').select('id', { count: 'exact', head: true }).eq('adult_id', adultId).eq('status', 'pending_parent');
  if ((count ?? 0) >= GUARDIAN_PENDING_MAX) return no('You have several requests waiting for a parent already. Wait for a reply before asking again.');
  const { data, error } = await admin.from('community_guardian_requests').insert({ adult_id: adultId, junior_id: juniorId, club_id: e.clubId, note: note || null }).select('id').maybeSingle();
  if (error || !data) return no('You already have a request with this young person, or it could not be sent.');
  const id = data.id as string;
  await logEvent(admin, id, adultId, 'requested');
  const who = await people(admin, [adultId, juniorId]);
  for (const parent of await parentsOf(admin, juniorId)) {
    await notify(admin, parent, { kind: 'guardian_request', title: `${who.get(adultId)?.name ?? 'A coach'} would like to connect with ${who.get(juniorId)?.name ?? 'your child'}`, body: 'Nothing happens unless you approve. Open Parent Community to decide.', data: { requestId: id } });
  }
  return ok({ sent: true });
}

type Row = { id: string; adult_id: string; junior_id: string; club_id: string; note: string | null; status: string; connection_id: string | null; created_at: string };

export type ParentRequest = { id: string; childName: string; adultName: string; club: string | null; note: string; status: 'pending_parent' | 'pending_junior' | 'active'; createdAt: string };

/** Requests about the parent's own children that still need them, or that are live. */
export async function getParentRequests(parentId: string): Promise<Result<ParentRequest[]>> {
  const admin = createAdminClient();
  const { data: links } = await admin.from('parent_child_links').select('child_profiles ( linked_user_id )').eq('parent_id', parentId).not('verified_at', 'is', null);
  const kids = (links ?? []).flatMap((l) => { const c = (Array.isArray(l.child_profiles) ? l.child_profiles[0] : l.child_profiles) as { linked_user_id: string | null } | null; return c?.linked_user_id ? [c.linked_user_id] : []; });
  if (!kids.length) return ok([]);
  const { data } = await admin.from('community_guardian_requests').select('id, adult_id, junior_id, club_id, note, status, connection_id, created_at').in('junior_id', kids).in('status', ['pending_parent', 'pending_junior', 'active']).order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];
  const who = await people(admin, rows.flatMap((r) => [r.adult_id, r.junior_id]));
  const { data: clubs } = rows.length ? await admin.from('clubs').select('id, name').in('id', [...new Set(rows.map((r) => r.club_id))]) : { data: [] as Array<{ id: string; name: string }> };
  return ok(rows.map((r) => ({
    id: r.id, childName: who.get(r.junior_id)?.name ?? 'Your child', adultName: who.get(r.adult_id)?.name ?? 'A coach',
    club: (clubs ?? []).find((c) => c.id === r.club_id)?.name ?? null, note: r.note ?? '', status: r.status as ParentRequest['status'], createdAt: r.created_at,
  })));
}

async function load(admin: Admin, id: string): Promise<Row | null> {
  const { data } = await admin.from('community_guardian_requests').select('id, adult_id, junior_id, club_id, note, status, connection_id, created_at').eq('id', id).maybeSingle();
  return (data as Row | null) ?? null;
}

/** A parent approves or declines. Approving opens a pending connection for the junior to accept. */
export async function decideAsParent(parentId: string, requestId: string, approve: boolean): Promise<Result<{ done: true }>> {
  if (!crossBandOpen()) return no('This is not open yet.');
  const admin = createAdminClient();
  const r = await load(admin, requestId);
  if (!r || r.status !== 'pending_parent') return no('Request not found.');
  if (!(await parentsOf(admin, r.junior_id)).includes(parentId)) return no('Request not found.');
  const stamp = { decided_by: parentId, decided_at: new Date().toISOString() };
  if (!approve) {
    await admin.from('community_guardian_requests').update({ status: 'declined', ...stamp }).eq('id', requestId);
    await logEvent(admin, requestId, parentId, 'parent_declined');
    return ok({ done: true });
  }
  // Eligibility is checked again now: a DBS may have lapsed since the request was made
  const e = await checkEligibility(admin, r.adult_id, r.junior_id);
  if (!e.ok) return no(e.reason);
  const { data: conn, error } = await admin.from('community_connections').insert({ requester_id: r.adult_id, addressee_id: r.junior_id }).select('id').maybeSingle();
  if (error || !conn) return no('Could not approve this just now.');
  await admin.from('community_guardian_requests').update({ status: 'pending_junior', connection_id: conn.id, ...stamp }).eq('id', requestId);
  await logEvent(admin, requestId, parentId, 'parent_approved');
  const who = await people(admin, [r.adult_id, r.junior_id]);
  await notify(admin, r.junior_id, { kind: 'guardian_decision', title: `${who.get(r.adult_id)?.name ?? 'Your coach'} would like to connect`, body: 'Your parent has said yes. Say yes too and you can message, with your parent able to see it.', data: { connectionId: conn.id as string } });
  return ok({ done: true });
}

/**
 * The junior's own answer, reached from the ordinary Connect/Not now buttons. Null means there is no
 * approved request, so the caller refuses as it always has for an adult and a junior.
 */
export async function answerAsJunior(admin: Admin, juniorId: string, adultId: string, yes: boolean): Promise<Result<{ link: 'connected' | 'passed'; connectionId: string | null }> | null> {
  if (!crossBandOpen()) return null;
  const { data } = await admin.from('community_guardian_requests').select('id, adult_id, junior_id, club_id, note, status, connection_id, created_at').eq('junior_id', juniorId).eq('adult_id', adultId).eq('status', 'pending_junior').maybeSingle();
  const r = data as Row | null;
  if (!r) return null;
  if (!yes) {
    await admin.from('community_guardian_requests').update({ status: 'declined' }).eq('id', r.id);
    if (r.connection_id) await admin.from('community_connections').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', r.connection_id);
    await logEvent(admin, r.id, juniorId, 'junior_declined');
    return ok({ link: 'passed', connectionId: null });
  }
  const e = await checkEligibility(admin, adultId, juniorId);
  if (!e.ok) return no(e.reason);
  await admin.from('community_guardian_requests').update({ status: 'active' }).eq('id', r.id);
  if (r.connection_id) await admin.from('community_connections').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', r.connection_id);
  await logEvent(admin, r.id, juniorId, 'junior_accepted');
  const who = await people(admin, [adultId, juniorId]);
  await notify(admin, adultId, { kind: 'connect_accepted', title: `${who.get(juniorId)?.name ?? 'They'} accepted`, body: 'You are connected. Their parent can read this conversation.', data: r.connection_id ? { connectionId: r.connection_id } : {} });
  for (const parent of await parentsOf(admin, juniorId)) {
    await notify(admin, parent, { kind: 'parent_connection', title: 'Your child is now connected with their coach', body: `${who.get(juniorId)?.name ?? 'Your child'} and ${who.get(adultId)?.name ?? 'their coach'} can now message. You can read it and end it in Parent Community.`, data: { requestId: r.id } });
  }
  return ok({ link: 'connected', connectionId: r.connection_id });
}

/** Whether an adult and a junior have an active, parent-approved contact. This is the only cross-age thread allowed. */
export async function guardianContactActive(admin: Admin, a: string, b: string): Promise<boolean> {
  if (!crossBandOpen()) return false;
  const { data } = await admin.from('community_guardian_requests').select('adult_id, junior_id')
    .eq('status', 'active').or(`and(adult_id.eq.${a},junior_id.eq.${b}),and(adult_id.eq.${b},junior_id.eq.${a})`).limit(1);
  const r = (data ?? [])[0] as { adult_id: string; junior_id: string } | undefined;
  // Still needs the adult to be eligible today: a lapsed DBS closes the thread without anyone having to remember
  return !!r && (await checkEligibility(admin, r.adult_id, r.junior_id)).ok;
}

/** The adult, the junior or the junior's parent ends it (or withdraws a request not yet answered). */
export async function endContact(userId: string, requestId: string): Promise<Result<{ ended: true }>> {
  const admin = createAdminClient();
  const r = await load(admin, requestId);
  if (!r || !['pending_parent', 'pending_junior', 'active'].includes(r.status)) return no('Request not found.');
  const isParent = (await parentsOf(admin, r.junior_id)).includes(userId);
  if (userId !== r.adult_id && userId !== r.junior_id && !isParent) return no('Request not found.');
  const status = r.status === 'active' ? 'ended' : 'withdrawn';
  await admin.from('community_guardian_requests').update({ status }).eq('id', requestId);
  if (r.connection_id) await admin.from('community_connections').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', r.connection_id);
  await logEvent(admin, requestId, userId, status === 'ended' ? 'ended' : 'withdrawn');
  return ok({ ended: true });
}

/** A parent reads the conversation between their child and an approved adult. Every read is logged. */
export async function getParentThread(parentId: string, requestId: string): Promise<Result<{ childName: string; adultName: string; messages: Array<Message & { fromAdult: boolean }> }>> {
  const admin = createAdminClient();
  const r = await load(admin, requestId);
  if (!r || r.status !== 'active' || !r.connection_id) return no('Conversation not found.');
  if (!(await parentsOf(admin, r.junior_id)).includes(parentId)) return no('Conversation not found.');
  const [{ data }, who] = await Promise.all([
    admin.from('community_messages').select('id, sender_id, body, created_at').eq('connection_id', r.connection_id).eq('status', 'live').order('created_at', { ascending: false }).limit(200),
    people(admin, [r.adult_id, r.junior_id]),
  ]);
  await logEvent(admin, requestId, parentId, 'thread_read');
  return ok({
    childName: who.get(r.junior_id)?.name ?? 'Your child', adultName: who.get(r.adult_id)?.name ?? 'The coach',
    messages: (data ?? []).reverse().map((m) => ({ id: m.id as string, body: m.body as string, createdAt: m.created_at as string, mine: false, fromAdult: m.sender_id === r.adult_id })),
  });
}
