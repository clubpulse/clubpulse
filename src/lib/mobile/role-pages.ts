// Server-only. What the phone app's role pages show, for a caller whose id has already been
// verified. The same four pages as the website (Player, Coach, Parent, Admin) with the same
// figures, read by user id so they work with the app's sign-in.

import { createAdminClient } from '@/lib/supabase/admin';
import { getAudience } from '@/lib/nav/audience';
import { asAdmin } from '@/lib/nav/menu';
import { ROLE_PAGES, holdsRole, rolePagesFor, type PageRole } from '@/lib/nav/role-pages';
import { getAdminClubIds, listApprovals, listMemberShifts } from '@/lib/mobile/club-data';
import { getHomeForUser, type MobileHome } from '@/lib/mobile/home';
import { dayLabel } from '@/lib/roles/data';

export type MobileRoleStat = { label: string; hint: string; value?: number; text?: string; suffix?: string };
export type MobileRolePage = {
  role: PageRole;
  /** False when the caller does not hold this role: the app shows how to ask for it */
  held: boolean;
  /** The role pages the caller has, for moving between them */
  pages: PageRole[];
  stats: MobileRoleStat[];
  next: { eyebrow: string; title: string; detail: string } | null;
  listTitle: string;
  rows: Array<{ title: string; detail: string; badge?: string }>;
  empty: string;
};

export const MOBILE_ROLES: PageRole[] = ['player', 'coach', 'parent', 'admin'];
export const isMobileRole = (v: unknown): v is PageRole => typeof v === 'string' && (MOBILE_ROLES as string[]).includes(v);

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const clock = (time: string | null | undefined) => (time ? time.slice(0, 5) : '');
type Body = Omit<MobileRolePage, 'role' | 'held' | 'pages'>;

const matchNext = (home: MobileHome, eyebrow: string): Body['next'] => (home.fixture
  ? { eyebrow: `${eyebrow} · ${dayLabel(home.fixture.date)}`, title: `v ${home.fixture.opponent}`, detail: [clock(home.fixture.time), home.fixture.venue].filter(Boolean).join(' · ') }
  : null);

async function player(userId: string): Promise<Body> {
  const db = createAdminClient();
  const [home, wallet, sessions] = await Promise.all([
    getHomeForUser(userId),
    db.from('creds_wallet').select('flexi_balance, reward_balance').eq('user_id', userId).maybeSingle(),
    db.from('analysis_results').select('id, created_at, result_json').eq('user_id', userId).eq('analysis_type', 'pose').order('created_at', { ascending: false }).limit(4),
  ]);
  const balance = ((wallet.data?.flexi_balance as number | undefined) ?? 0) + ((wallet.data?.reward_balance as number | undefined) ?? 0);
  const marked = (sessions.data ?? []).map((s) => {
    const r = (s.result_json ?? {}) as { overall?: number; mode?: string; shotType?: string };
    return { at: s.created_at as string, overall: typeof r.overall === 'number' ? Math.round(r.overall) : null, mode: r.mode ?? 'batting', shot: r.shotType };
  });
  const latest = marked.find((m) => m.overall !== null) ?? null;
  return {
    stats: [
      { label: 'Scores', value: balance, hint: 'Earned by taking part' },
      { label: 'Day streak', value: home.streak.day, hint: home.streak.day > 0 ? 'Check in to keep it going' : 'Check in to start one' },
      { label: 'Club league', text: home.league ? ordinal(home.league.rank) : '–', hint: home.league ? 'Your place this week' : 'Earn Scores to join the table' },
      { label: 'Technique mark', value: latest?.overall ?? undefined, text: latest ? undefined : '–', suffix: latest ? '/100' : undefined, hint: latest ? 'From your last clip' : 'Film a clip to get one' },
    ],
    next: matchNext(home, 'Next match'),
    listTitle: 'Recent technique sessions',
    rows: marked.map((m) => ({ title: `${m.mode === 'bowling' ? 'Bowling' : 'Batting'}${m.shot ? ` · ${m.shot}` : ''}`, detail: dayLabel(m.at), badge: m.overall !== null ? `${m.overall}/100` : undefined })),
    empty: 'No sessions yet. Film a shot or a delivery to get your first mark.',
  };
}

async function coach(userId: string): Promise<Body> {
  const db = createAdminClient();
  const [{ data: bookings }, { data: profiles }] = await Promise.all([
    db.from('coaching_bookings').select('session_date, session_time, status, scores_paid, listing:coaching_listings ( title )').eq('coach_user_id', userId).order('session_date', { ascending: true }),
    db.from('coach_profiles').select('id').eq('user_id', userId),
  ]);
  const ids = (profiles ?? []).map((p) => p.id as string);
  const { data: certs } = ids.length
    ? await db.from('coach_certifications').select('expiry_date').in('coach_id', ids).eq('verified', true)
    : { data: [] as Array<{ expiry_date: string | null }> };
  const today = new Date().toISOString().slice(0, 10);
  const all = (bookings ?? []).map((b) => ({
    date: b.session_date as string, time: b.session_time as string | null, status: b.status as string, paid: (b.scores_paid as number | null) ?? 0,
    title: (one(b.listing as unknown) as { title?: string } | null)?.title ?? 'Coaching session',
  }));
  const upcoming = all.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.date >= today);
  const done = all.filter((b) => b.status === 'completed');
  const waiting = upcoming.filter((b) => b.status === 'pending').length;
  const held = (certs ?? []).filter((c) => !c.expiry_date || (c.expiry_date as string) >= today).length;
  const first = upcoming[0] ?? null;
  return {
    stats: [
      { label: 'Sessions coming up', value: upcoming.length, hint: waiting > 0 ? `${waiting} waiting for your reply` : 'All confirmed' },
      { label: 'Sessions delivered', value: done.length, hint: 'Since you started here' },
      { label: 'Scores from coaching', value: done.reduce((sum, b) => sum + b.paid, 0), hint: 'Paid by players' },
      { label: 'Qualifications checked', value: held, hint: held > 0 ? 'In date, on your profile' : 'Add yours for players to see' },
    ],
    next: first ? { eyebrow: `Next session · ${dayLabel(first.date)}`, title: first.title, detail: [clock(first.time), first.status === 'pending' ? 'Waiting for you to confirm' : 'Confirmed'].filter(Boolean).join(' · ') } : null,
    listTitle: 'Bookings',
    rows: upcoming.slice(0, 4).map((b) => ({ title: b.title, detail: [dayLabel(b.date), clock(b.time)].filter(Boolean).join(' · '), badge: b.status === 'pending' ? 'To confirm' : 'Confirmed' })),
    empty: 'No bookings yet. Offer a session and players at your club can book it.',
  };
}

async function parent(userId: string): Promise<Body> {
  const db = createAdminClient();
  const [home, { data: links }] = await Promise.all([
    getHomeForUser(userId),
    db.from('parent_child_links').select('verified_at, child_profiles ( id, first_name, last_name )').eq('parent_id', userId),
  ]);
  const children = (links ?? []).flatMap((l) => {
    const c = one(l.child_profiles as unknown) as { id: string; first_name: string; last_name: string } | null;
    return c ? [{ id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), verified: !!l.verified_at }] : [];
  });
  const ids = children.map((c) => c.id);
  const { data: records } = ids.length
    ? await db.from('consent_records').select('child_id, consent_type, action, created_at').in('child_id', ids).order('created_at', { ascending: true })
    : { data: [] as Array<{ child_id: string; consent_type: string; action: string }> };
  const latest = new Map<string, string>();
  for (const r of records ?? []) latest.set(`${r.child_id}:${r.consent_type}`, r.action as string);
  const granted = (id: string) => [...latest].filter(([k, v]) => k.startsWith(`${id}:`) && v === 'granted').length;
  const waiting = children.filter((c) => !c.verified).length;
  return {
    stats: [
      { label: children.length === 1 ? 'Child at the club' : 'Children at the club', value: children.length, hint: children.length ? 'Linked to your account' : 'Add your child to start' },
      { label: 'Confirmed by the club', value: children.length - waiting, hint: waiting > 0 ? `${waiting} still to confirm` : 'Nothing waiting' },
      { label: 'Consents given', value: children.reduce((sum, c) => sum + granted(c.id), 0), hint: 'Change them at any time' },
      { label: 'Waiting for the club', value: waiting, hint: waiting > 0 ? 'The club will confirm the link' : 'All confirmed' },
    ],
    next: matchNext(home, 'Next club match'),
    listTitle: 'Your children',
    rows: children.map((c) => ({ title: c.name, detail: `${granted(c.id)} ${granted(c.id) === 1 ? 'consent' : 'consents'} given`, badge: c.verified ? 'Confirmed' : 'Waiting for the club' })),
    empty: 'No child is linked to your account yet. Add them and the club will confirm the link.',
  };
}

const APPROVAL: Record<string, string> = { link_junior: 'Parent and child link', coach_verification: 'Coach to approve', join_club: 'Wants to join' };

async function admin(userId: string): Promise<Body> {
  const db = createAdminClient();
  const clubIds = await getAdminClubIds(userId);
  const [members, approvals, home, open] = await Promise.all([
    clubIds.length ? db.from('club_members').select('user_id', { count: 'exact', head: true }).in('club_id', clubIds).eq('is_active', true) : Promise.resolve({ count: 0 }),
    listApprovals(userId),
    getHomeForUser(userId),
    listMemberShifts(userId, 'available'),
  ]);
  const unfilled = open.filter((s) => s.spots_filled < s.spots_total);
  const oldest = [...approvals].sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
  return {
    stats: [
      { label: 'Members', value: members.count ?? 0, hint: 'Active at your club' },
      { label: 'Waiting for you', value: approvals.length, hint: approvals.length ? 'To approve or decline' : 'Nothing to approve' },
      { label: 'Shifts to fill', value: unfilled.length, hint: unfilled.length ? 'Still need a volunteer' : 'All covered' },
      { label: 'Scores on offer', value: unfilled.reduce((sum, s) => sum + s.scores_reward, 0), hint: 'Across the open shifts' },
    ],
    next: oldest
      ? { eyebrow: `Waiting since ${dayLabel(oldest.created_at)}`, title: oldest.requester_name, detail: APPROVAL[oldest.type] ?? 'Request' }
      : matchNext(home, 'Next match'),
    listTitle: 'Requests to review',
    rows: approvals.slice(0, 5).map((a) => ({ title: a.requester_name, detail: `${APPROVAL[a.type] ?? 'Request'} · ${dayLabel(a.created_at)}`, badge: 'Pending' })),
    empty: 'No requests are waiting. New members, coaches and parent links appear here.',
  };
}

const LOADERS: Record<string, (userId: string) => Promise<Body>> = { player, coach, parent, admin };
const NOTHING: Body = { stats: [], next: null, listTitle: '', rows: [], empty: '' };

export async function getRolePageForUser(userId: string, role: PageRole): Promise<MobileRolePage> {
  const [base, adminClubs] = await Promise.all([getAudience(userId), getAdminClubIds(userId)]);
  const audience = adminClubs.length > 0 ? asAdmin(base) : base;
  const pages = rolePagesFor(audience).map((p) => p.role);
  const held = holdsRole(audience, role) && role in LOADERS && !!ROLE_PAGES[role];
  return { role, held, pages, ...(held ? await LOADERS[role](userId) : NOTHING) };
}
