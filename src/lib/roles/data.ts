// Server-only. What each role page shows: a few figures, what is coming up next, and a short list.
// Every loader reads for the signed-in person only and returns the same shape, so one page layout
// serves all four roles.

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchWallet } from '@/lib/profile/service';
import { getPrimaryClubId } from '@/lib/scores/context';
import { getPlaySummary } from '@/lib/actions/scores-engine';
import { getMyFixtures } from '@/lib/actions/availability';
import { getMyCoachingRequests } from '@/lib/actions/coaching';
import { getAdminClubIds, listApprovals, listMemberShifts } from '@/lib/mobile/club-data';
import { totalBalance } from '@/lib/types/scores';
import type { PageRole } from '@/lib/nav/role-pages';

export type RoleStat = { label: string; hint: string; value?: number; text?: string; suffix?: string };
export type RoleNext = { eyebrow: string; title: string; detail: string; href: string; cta: string } | null;
export type RoleRow = { title: string; detail: string; badge?: string; href?: string };
export type RoleData = {
  stats: RoleStat[];
  next: RoleNext;
  /** What to show in the "next" panel when nothing is coming up */
  nothingNext: { title: string; detail: string; href: string; cta: string };
  listTitle: string;
  rows: RoleRow[];
  empty: string;
  action: { label: string; href: string };
};

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/** "Sat 21 Nov" from a date, read as a calendar day with no time zone shift. */
export function dayLabel(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}

const clock = (time: string | null | undefined) => (time ? time.slice(0, 5) : '');

async function player(userId: string): Promise<RoleData> {
  const supabase = await createClient();
  const clubId = await getPrimaryClubId(userId);
  const [wallet, play, fixtures, sessions] = await Promise.all([
    fetchWallet(supabase, userId),
    getPlaySummary(),
    clubId ? getMyFixtures(clubId) : Promise.resolve([]),
    supabase.from('analysis_results').select('id, created_at, result_json').eq('user_id', userId).eq('analysis_type', 'pose')
      .order('created_at', { ascending: false }).limit(4),
  ]);
  const balance = totalBalance(wallet.success ? wallet.data : null);
  const streak = play.success ? play.data.checkin.lastDay : 0;
  const me = play.success ? play.data.league.find((r) => r.isMe) ?? null : null;
  const marked = (sessions.data ?? []).map((s) => {
    const r = (s.result_json ?? {}) as { overall?: number; mode?: string; shotType?: string };
    return { id: s.id as string, at: s.created_at as string, overall: typeof r.overall === 'number' ? Math.round(r.overall) : null, mode: r.mode ?? 'batting', shot: r.shotType };
  });
  const latest = marked.find((m) => m.overall !== null) ?? null;
  const fixture = fixtures[0] ?? null;

  return {
    stats: [
      { label: 'Scores', value: balance, hint: 'Earned by taking part' },
      { label: 'Day streak', value: streak, hint: streak > 0 ? 'Check in to keep it going' : 'Check in to start one' },
      { label: 'Club league', text: me ? ordinal(me.rank) : '–', hint: me ? 'Your place this season' : 'Earn Scores to join the table' },
      { label: 'Latest technique mark', value: latest?.overall ?? undefined, text: latest ? undefined : '–', suffix: latest ? '/100' : undefined, hint: latest ? 'From your last analysed clip' : 'Film a clip to get one' },
    ],
    next: fixture
      ? { eyebrow: `Next fixture · ${dayLabel(fixture.match_date)}`, title: `v ${fixture.opponent}`, detail: [clock(fixture.match_time), fixture.venue].filter(Boolean).join(' · '), href: '/availability', cta: 'Set your availability' }
      : null,
    nothingNext: { title: 'No match in the diary', detail: 'When your club adds a fixture it appears here.', href: '/match-day', cta: 'Open match day' },
    listTitle: 'Recent net sessions',
    rows: marked.map((m) => ({
      title: `${m.mode === 'bowling' ? 'Bowling' : 'Batting'}${m.shot ? ` · ${m.shot}` : ''}`,
      detail: dayLabel(m.at),
      badge: m.overall !== null ? `${m.overall}/100` : undefined,
      href: '/coaching-history',
    })),
    empty: 'No sessions yet. Film a shot or a delivery to get your first mark.',
    action: { label: 'Analyse my technique', href: '/analyse' },
  };
}

async function coach(userId: string): Promise<RoleData> {
  const admin = createAdminClient();
  const [requests, listings, certs] = await Promise.all([
    getMyCoachingRequests(),
    admin.from('coaching_listings').select('id', { count: 'exact', head: true }).eq('coach_user_id', userId).eq('is_active', true),
    admin.from('coach_profiles').select('id').eq('user_id', userId),
  ]);
  const profileIds = (certs.data ?? []).map((p) => p.id as string);
  const { data: certRows } = profileIds.length
    ? await admin.from('coach_certifications').select('expiry_date').in('coach_id', profileIds).eq('verified', true)
    : { data: [] as Array<{ expiry_date: string | null }> };
  const bookings = requests.success ? requests.data : [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.session_date >= today);
  const done = bookings.filter((b) => b.status === 'completed');
  const waiting = bookings.filter((b) => b.status === 'pending');
  const held = ((certRows ?? []) as Array<{ expiry_date: string | null }>).filter((c) => !c.expiry_date || c.expiry_date >= today);
  const first = upcoming[0] ?? null;

  return {
    stats: [
      { label: 'Sessions coming up', value: upcoming.length, hint: waiting.length > 0 ? `${waiting.length} waiting for your reply` : 'All confirmed' },
      { label: 'Sessions delivered', value: done.length, hint: 'Since you started coaching here' },
      { label: 'Scores from coaching', value: done.reduce((sum, b) => sum + (b.scores_paid ?? 0), 0), hint: 'Paid by players for sessions' },
      { label: 'Qualifications checked', value: held.length, hint: held.length > 0 ? 'In date and shown on your coach profile' : 'Add yours so players can see them' },
    ],
    next: first
      ? { eyebrow: `Next session · ${dayLabel(first.session_date)}`, title: first.listing?.title ?? 'Coaching session', detail: [clock(first.session_time), first.status === 'pending' ? 'Waiting for you to confirm' : 'Confirmed'].filter(Boolean).join(' · '), href: '/coaching?tab=coach', cta: 'Open my sessions' }
      : null,
    nothingNext: { title: 'No sessions booked', detail: 'Offer a session and players at your club can book it.', href: '/coaching?tab=coach', cta: 'Offer a session' },
    listTitle: 'On the fixture card',
    rows: upcoming.slice(0, 4).map((b) => ({
      title: b.listing?.title ?? 'Coaching session',
      detail: [dayLabel(b.session_date), clock(b.session_time)].filter(Boolean).join(' · '),
      badge: b.status === 'pending' ? 'To confirm' : 'Confirmed',
      href: '/coaching?tab=coach',
    })),
    empty: listings.count ? 'No bookings yet. Your sessions are live for players to book.' : 'You have no sessions on offer yet.',
    action: { label: 'Manage my coaching', href: '/coaching?tab=coach' },
  };
}

async function parent(userId: string): Promise<RoleData> {
  const admin = createAdminClient();
  const clubId = await getPrimaryClubId(userId);
  const [{ data: links }, fixtures] = await Promise.all([
    admin.from('parent_child_links').select('relationship, verified_at, child_profiles ( id, first_name, last_name, date_of_birth )').eq('parent_id', userId),
    clubId ? getMyFixtures(clubId) : Promise.resolve([]),
  ]);
  const children = (links ?? []).flatMap((l) => {
    const c = one(l.child_profiles as unknown) as { id: string; first_name: string; last_name: string; date_of_birth: string | null } | null;
    return c ? [{ id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), verified: !!l.verified_at, relationship: (l.relationship as string) ?? 'Parent' }] : [];
  });
  const ids = children.map((c) => c.id);
  const { data: records } = ids.length
    ? await admin.from('consent_records').select('child_id, consent_type, action, created_at').in('child_id', ids).order('created_at', { ascending: true })
    : { data: [] as Array<{ child_id: string; consent_type: string; action: string }> };
  // The latest answer for each consent wins
  const latest = new Map<string, string>();
  for (const r of records ?? []) latest.set(`${r.child_id}:${r.consent_type}`, r.action as string);
  const granted = (id: string) => [...latest].filter(([k, v]) => k.startsWith(`${id}:`) && v === 'granted').length;
  const waiting = children.filter((c) => !c.verified).length;
  const fixture = fixtures[0] ?? null;

  return {
    stats: [
      { label: children.length === 1 ? 'Child at the club' : 'Children at the club', value: children.length, hint: children.length ? 'Linked to your account' : 'Add your child to get started' },
      { label: 'Confirmed by the club', value: children.length - waiting, hint: waiting > 0 ? `${waiting} waiting for the club to confirm` : 'Nothing waiting' },
      { label: 'Consents given', value: children.reduce((sum, c) => sum + granted(c.id), 0), hint: 'You can change these at any time' },
      { label: 'Club fixtures ahead', value: fixtures.length, hint: 'Matches in the diary' },
    ],
    next: fixture
      ? { eyebrow: `Next club fixture · ${dayLabel(fixture.match_date)}`, title: `v ${fixture.opponent}`, detail: [clock(fixture.match_time), fixture.venue].filter(Boolean).join(' · '), href: '/match-day', cta: 'See match day' }
      : null,
    nothingNext: { title: 'No match in the diary', detail: 'Fixtures appear here when the club adds them.', href: '/noticeboard', cta: 'Read the noticeboard' },
    listTitle: 'Your juniors',
    rows: children.map((c) => ({
      title: c.name,
      detail: `${granted(c.id)} ${granted(c.id) === 1 ? 'consent' : 'consents'} given`,
      badge: c.verified ? 'Confirmed' : 'Waiting for the club',
      href: '/profile',
    })),
    empty: 'No child is linked to your account yet. Add them from your profile and the club will confirm the link.',
    action: { label: 'Manage my children', href: '/profile' },
  };
}

async function volunteer(userId: string): Promise<RoleData> {
  const admin = createAdminClient();
  const [mine, open, { count: completed }] = await Promise.all([
    listMemberShifts(userId, 'my'),
    listMemberShifts(userId, 'available'),
    admin.from('volunteer_shift_signups').select('shift_id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
  ]);
  const free = open.filter((s) => s.spots_filled < s.spots_total);
  const first = mine[0] ?? null;
  const when = (s: { start_time: string; end_time: string }) => `${dayLabel(s.start_time)} · ${s.start_time.slice(11, 16)} to ${s.end_time.slice(11, 16)}`;

  return {
    stats: [
      { label: 'Shifts you are down for', value: mine.length, hint: mine.length ? 'Thank you for helping' : 'Pick one below' },
      { label: 'Shifts completed', value: completed ?? 0, hint: 'Since you joined' },
      { label: 'Open shifts at your club', value: free.length, hint: free.length ? 'Still need someone' : 'All covered for now' },
      { label: 'Scores on offer', value: free.reduce((sum, s) => sum + s.scores_reward, 0), hint: 'Across the open shifts' },
    ],
    next: first
      ? { eyebrow: `Your next shift · ${dayLabel(first.start_time)}`, title: first.title, detail: [`${first.start_time.slice(11, 16)} to ${first.end_time.slice(11, 16)}`, first.location].filter(Boolean).join(' · '), href: '/match-day', cta: 'See match day' }
      : null,
    nothingNext: { title: 'You have no shift booked', detail: free.length ? 'There are shifts open at your club right now.' : 'New shifts appear here when the club posts them.', href: '/noticeboard', cta: 'Read the noticeboard' },
    listTitle: 'Shifts that need someone',
    rows: free.slice(0, 5).map((s) => ({
      title: s.title,
      detail: when(s),
      badge: `+${s.scores_reward} Scores`,
    })),
    empty: 'Every shift is covered at the moment. Thank you to everyone who signed up.',
    action: { label: 'Earn Scores', href: '/play' },
  };
}

const APPROVAL: Record<string, string> = { link_junior: 'Parent and child link', coach_verification: 'Coach to approve', join_club: 'Wants to join' };

async function admin(userId: string): Promise<RoleData> {
  const db = createAdminClient();
  const clubIds = await getAdminClubIds(userId);
  const primary = clubIds[0] ?? (await getPrimaryClubId(userId));
  const [members, approvals, fixtures, open] = await Promise.all([
    clubIds.length
      ? db.from('club_members').select('user_id', { count: 'exact', head: true }).in('club_id', clubIds).eq('is_active', true)
      : Promise.resolve({ count: 0 }),
    listApprovals(userId),
    primary ? getMyFixtures(primary) : Promise.resolve([]),
    listMemberShifts(userId, 'available'),
  ]);
  const unfilled = open.filter((s) => s.spots_filled < s.spots_total);
  const fixture = fixtures[0] ?? null;
  const oldest = [...approvals].sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;

  return {
    stats: [
      { label: 'Members', value: members.count ?? 0, hint: 'Active at your club' },
      { label: 'Waiting for you', value: approvals.length, hint: approvals.length ? 'Requests to approve or decline' : 'Nothing to approve' },
      { label: 'Fixtures ahead', value: fixtures.length, hint: 'Matches in the diary' },
      { label: 'Shifts to fill', value: unfilled.length, hint: unfilled.length ? 'Still need a volunteer' : 'All covered for now' },
    ],
    next: oldest
      ? { eyebrow: `Waiting since ${dayLabel(oldest.created_at)}`, title: oldest.requester_name, detail: `${APPROVAL[oldest.type] ?? 'Request'}${oldest.details ? ` · ${oldest.details}` : ''}`, href: '/admin/club/members', cta: 'Review requests' }
      : fixture
        ? { eyebrow: `Next fixture · ${dayLabel(fixture.match_date)}`, title: `v ${fixture.opponent}`, detail: [clock(fixture.match_time), fixture.venue].filter(Boolean).join(' · '), href: '/admin/club/availability', cta: 'See who is available' }
        : null,
    nothingNext: { title: 'Nothing is waiting for you', detail: 'Requests from members and the next fixture appear here.', href: '/admin/club', cta: 'Open club admin' },
    listTitle: 'Awaiting your decision',
    rows: approvals.slice(0, 5).map((a) => ({
      title: a.requester_name,
      detail: `${APPROVAL[a.type] ?? 'Request'} · ${dayLabel(a.created_at)}`,
      badge: 'Pending',
      href: '/admin/club/members',
    })),
    empty: 'No requests are waiting. New members, coaches and parent links appear here for you to approve.',
    action: { label: 'Open club admin', href: '/admin/club' },
  };
}

const LOADERS: Record<PageRole, (userId: string) => Promise<RoleData>> = { player, coach, parent, admin, volunteer };

export function getRoleData(role: PageRole, userId: string): Promise<RoleData> {
  return LOADERS[role](userId);
}
