// COMMUNITY_JUNIORS_ENABLED: under-18s are off unless it is exactly "true". Adults are never affected. Enforced in the
// service layer that every API route, server action and the mobile app go through, not only in the UI.
import { memdb, client } from './helpers/memdb';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => client() }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: async () => ({ status: 'live' }) }));
jest.mock('@/lib/scores/context', () => ({ awardScores: async () => ({ ok: true }) }));
jest.mock('@/lib/supabase/request-auth', () => ({ getRequestAuth: async (req: { headers: Headers }) => ({ user: { id: req.headers.get('x-test-user') } }) }));
(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: true });

import { NextRequest } from 'next/server';
import { getViewer, holdFor, juniorsOpen, juniorMessagingOpen, JUNIORS_OFF, JUNIOR_DMS_OFF, getFeed, getNearby, getConnections, getMessages, sendMessage, answerPerson, visibleAuthors, people } from '@/lib/community/service';
import { createSession, joinSession, listSessions } from '@/lib/community/sessions';
import { crossBandOpen, requestJunior } from '@/lib/community/guardian';
import { decideJuniorConnection } from '@/lib/community/junior-approval';
import { GET as sessionsGET, POST as sessionsPOST } from '@/app/api/community/sessions/route';
import { createAdminClient } from '@/lib/supabase/admin';

const soon = () => new Date(Date.now() + 3 * 86400000).toISOString();
const member = (user_id: string, over: Record<string, unknown> = {}) => ({ user_id, club_id: 'c1', role: 'player', is_junior: false, is_active: true, joined_at: '2024-01-01', ...over });
const profile = (id: string, name: string, dob = '1985-01-01') => ({ id, full_name: name, display_name: null, date_of_birth: dob, push_token: null });
const dbs = (user_id: string) => ({ user_id, club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: '2999-01-01' });
const sess = (id: string, over: Record<string, unknown> = {}) => ({ id, host_id: 'coach', club_id: 'c1', kind: 'nets', age_band: 'junior', title: id, note: null, place: 'Fairwick Ground', starts_at: soon(), capacity: 10, status: 'open', responsible_adult_id: 'carla', ...over });

const world = () => memdb.reset({
  clubs: [{ id: 'c1', name: 'Fairwick CC', county: null, league: null, ground_lat: null, ground_lng: null }],
  club_members: [member('coach', { role: 'coach' }), member('carla'), member('dan'), member('kid', { is_junior: true }), member('kid2', { is_junior: true })],
  dbs_checks: [dbs('coach'), dbs('carla')],
  profiles: [profile('coach', 'Coach C'), profile('carla', 'Carla Adult'), profile('dan', 'Dan Adult'), profile('kid', 'Kit Young', '2012-06-01'), profile('kid2', 'Kay Young', '2012-07-01')],
  community_blocks: [],
  child_profiles: [
    { linked_user_id: 'kid', parent_child_links: [{ parent_id: 'mum', verified_at: '2026-01-01' }] },
    { linked_user_id: 'kid2', parent_child_links: [{ parent_id: 'dad', verified_at: '2026-01-01' }] },
  ],
  community_session_signups: [],
  community_sessions: [sess('junior-1'), sess('adult-1', { age_band: 'adult', responsible_adult_id: null, host_id: 'carla' })],
  community_connections: [
    { id: 'kk', requester_id: 'kid', addressee_id: 'kid2', status: 'accepted', created_at: '2026-01-01' },
    { id: 'ad', requester_id: 'dan', addressee_id: 'carla', status: 'accepted', created_at: '2026-01-01' },
    { id: 'ak', requester_id: 'dan', addressee_id: 'kid', status: 'accepted', created_at: '2026-01-01' },
  ],
  community_posts: [], community_messages: [], community_profiles: [], community_notifications: [],
});

const off = () => { delete process.env.COMMUNITY_JUNIORS_ENABLED; };
const on = () => { process.env.COMMUNITY_JUNIORS_ENABLED = 'true'; };
const wrote = (t: string, op: string) => memdb.writes.filter((w) => w.table === t && w.op === op);
const admin = () => createAdminClient() as never;

beforeEach(() => {
  process.env.COMMUNITY_ENABLED = 'true'; delete process.env.COMMUNITY_JUNIOR_DMS; delete process.env.COMMUNITY_CROSSBAND_ENABLED;
  off(); world();
});
afterAll(() => { delete process.env.COMMUNITY_JUNIORS_ENABLED; });

describe('the flag', () => {
  it.each([[undefined], [''], ['TRUE'], ['True'], ['true '], [' true'], ['1'], ['yes'], ['on'], ['false']])('is off for %p', (v) => {
    if (v === undefined) delete process.env.COMMUNITY_JUNIORS_ENABLED; else process.env.COMMUNITY_JUNIORS_ENABLED = v;
    expect(juniorsOpen()).toBe(false);
  });
  it('is on only for exactly "true"', () => { on(); expect(juniorsOpen()).toBe(true); });
  it('also closes junior messaging and adult-to-junior contact, even when their own flags are on', () => {
    process.env.COMMUNITY_JUNIOR_DMS = 'true'; process.env.COMMUNITY_CROSSBAND_ENABLED = 'true';
    expect(juniorMessagingOpen()).toBe(false); expect(crossBandOpen()).toBe(false);
    on();
    expect(juniorMessagingOpen()).toBe(true); expect(crossBandOpen()).toBe(true);
    delete process.env.COMMUNITY_JUNIOR_DMS; delete process.env.COMMUNITY_CROSSBAND_ENABLED;
    expect(juniorMessagingOpen()).toBe(false); expect(crossBandOpen()).toBe(false); // each still needs its own flag
  });
});

describe('juniors cannot use the Community while it is off', () => {
  it('shuts a junior out with a plain reason and no clubs, and leaves an adult alone', async () => {
    const kid = await getViewer(admin(), 'kid');
    expect(kid).toMatchObject({ junior: true, hold: JUNIORS_OFF, clubIds: [], club: null });
    expect(await holdFor(admin(), 'kid')).toBe(JUNIORS_OFF);
    const adult = await getViewer(admin(), 'dan');
    expect(adult).toMatchObject({ junior: false, hold: null, clubIds: ['c1'] });
  });
  it('is the same junior, open, once it is on', async () => {
    on();
    expect(await getViewer(admin(), 'kid')).toMatchObject({ hold: null, clubIds: ['c1'] });
  });
  it('refuses every junior action server-side: feed, post, nearby, connections, matching, sessions', async () => {
    expect(await getFeed('kid', 'club')).toEqual({ success: false, error: JUNIORS_OFF });
    expect((await getNearby('kid', 'club', null)).success).toBe(false);
    expect(await getConnections('kid')).toEqual({ success: false, error: JUNIORS_OFF });
    expect(await answerPerson('kid', 'kid2', true)).toEqual({ success: false, error: JUNIORS_OFF });
    expect(await listSessions('kid', 'club', null)).toEqual({ success: false, error: JUNIORS_OFF });
    expect(await joinSession('kid', 'junior-1', true)).toEqual({ success: false, error: JUNIORS_OFF });
    expect(wrote('community_connections', 'insert')).toHaveLength(0);
    expect(wrote('community_session_signups', 'upsert')).toHaveLength(0);
  });
  it('lets the same juniors in when it is on', async () => {
    on();
    expect((await getFeed('kid', 'club')).success).toBe(true);
    expect((await listSessions('kid', 'club', null)).success).toBe(true);
    expect((await joinSession('kid', 'junior-1', true)).success).toBe(true);
  });
  it('treats an under-18 by date of birth the same as one marked by a club', async () => {
    memdb.tables.club_members = memdb.tables.club_members.map((m) => (m.user_id === 'kid' ? { ...m, is_junior: false } : m));
    expect((await getViewer(admin(), 'kid')).hold).toBe(JUNIORS_OFF);
  });
});

describe('juniors are not shown to anyone while it is off', () => {
  it('hides them from everyone else and marks them not cleared', async () => {
    const who = await people(admin(), ['kid', 'dan']);
    expect(who.get('kid')).toMatchObject({ junior: true, cleared: false, hold: JUNIORS_OFF });
    expect(who.get('dan')).toMatchObject({ junior: false, cleared: true });
    expect([...(await visibleAuthors(admin(), 'coach', ['kid', 'dan']))]).toEqual(['dan']);
    on();
    expect((await people(admin(), ['kid'])).get('kid')?.cleared).toBe(true);
  });
  it('does not list connections with juniors for an adult, and still lists adult ones', async () => {
    const r = await getConnections('dan');
    expect(r.success && r.data.map((c) => c.id).sort()).toEqual(['ad']);
    on();
    const r2 = await getConnections('dan');
    expect(r2.success && r2.data.map((c) => c.id)).toEqual(expect.arrayContaining(['ad', 'ak']));
  });
});

describe('sessions', () => {
  it('hides junior sessions from adults and keeps adult ones', async () => {
    const r = await listSessions('coach', 'club', null);
    expect(r.success && r.data.map((s) => s.id)).toEqual(['adult-1']);
    on();
    const r2 = await listSessions('coach', 'club', null);
    expect(r2.success && r2.data.map((s) => s.id).sort()).toEqual(['adult-1', 'junior-1']);
  });
  it('cannot create a junior session, and can still create an adult one', async () => {
    const base = { clubId: 'c1', kind: 'nets', title: 'Under-12 nets', note: '', place: 'Fairwick Ground', startsAt: soon(), capacity: 8, responsibleAdultId: 'carla' };
    expect(await createSession('coach', { ...base, band: 'junior' } as never)).toEqual({ success: false, error: JUNIORS_OFF });
    expect(wrote('community_sessions', 'insert')).toHaveLength(0);
    expect((await createSession('coach', { ...base, band: 'adult', responsibleAdultId: undefined } as never)).success).toBe(true);
    on();
    expect((await createSession('coach', { ...base, band: 'junior' } as never)).success).toBe(true);
  });
  it('cannot be joined by anyone while off, and an adult session can still be joined by an adult', async () => {
    expect((await joinSession('dan', 'junior-1', true)).success).toBe(false);
    expect((await joinSession('dan', 'adult-1', true)).success).toBe(true);
    expect(wrote('community_session_signups', 'upsert').map((w) => (w.row as { session_id: string }).session_id)).toEqual(['adult-1']);
  });
});

describe('private messages and contact', () => {
  it('stay closed to juniors off, even with the DM flag on, and never touch adults', async () => {
    process.env.COMMUNITY_JUNIOR_DMS = 'true';
    expect(await getMessages('kid', 'kk')).toEqual({ success: false, error: JUNIOR_DMS_OFF });
    expect((await sendMessage('kid2', 'kk', 'hi')).success).toBe(false);
    expect(wrote('community_messages', 'insert')).toHaveLength(0);
    expect((await sendMessage('dan', 'ad', 'hello Carla')).success).toBe(true);
    expect(wrote('community_messages', 'insert')).toHaveLength(1);
  });
  it('on, but with the DM flag unset, junior DMs are still off', async () => {
    on();
    expect(await sendMessage('kid', 'kk', 'hi')).toEqual({ success: false, error: JUNIOR_DMS_OFF });
  });
  it('an adult cannot ask a junior, and a parent cannot approve a junior connection', async () => {
    process.env.COMMUNITY_CROSSBAND_ENABLED = 'true';
    expect((await requestJunior('dan', 'kid', 'Fancy a net?')).success).toBe(false);
    expect(await decideJuniorConnection('mum', 'kk', 'whatever', true)).toEqual({ success: false, error: JUNIORS_OFF });
  });
});

describe('through the API routes', () => {
  const as = (user: string, method: 'GET' | 'POST', body?: unknown) => new NextRequest('http://localhost/api/community/sessions?scope=club', {
    method, headers: { 'x-test-user': user, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  it('refuses a junior on GET and POST, serves an adult, and serves the junior once on', async () => {
    const g = await sessionsGET(as('kid', 'GET'));
    expect(g.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(await g.json())).toContain('under-18s');
    expect((await sessionsPOST(as('kid', 'POST', { sessionId: 'junior-1', join: true }))).status).toBeGreaterThanOrEqual(400);
    expect((await sessionsGET(as('dan', 'GET'))).status).toBe(200);
    on();
    expect((await sessionsGET(as('kid', 'GET'))).status).toBe(200);
  });
});

describe('adults are unaffected', () => {
  it('can do everything an adult could before, with the switch off', async () => {
    expect((await getFeed('dan', 'club')).success).toBe(true);
    expect((await getNearby('dan', 'club', null)).success).toBe(true);
    expect((await listSessions('dan', 'club', null)).success).toBe(true);
    expect((await joinSession('dan', 'adult-1', true)).success).toBe(true);
  });
});
