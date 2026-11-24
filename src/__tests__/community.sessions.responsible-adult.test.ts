// These tests are about how under-18s behave when the Community is open to them
process.env.COMMUNITY_JUNIORS_ENABLED = 'true';
// A junior session names a responsible adult: an adult member of the club with a current enhanced DBS check there.
import { memdb, client } from './helpers/memdb';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => client() }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: async () => ({ status: 'live' }) }));
jest.mock('@/lib/scores/context', () => ({ awardScores: async () => ({ ok: true }) }));
(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: true });

import { createSession, joinSession, listSessions, responsibleAdultOptions } from '@/lib/community/sessions';

const soon = () => new Date(Date.now() + 3 * 86400000).toISOString();
const later = () => new Date(Date.now() + 5 * 86400000).toISOString();
const dbs = (user_id: string, over: Record<string, unknown> = {}) => ({ user_id, club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: '2999-01-01', ...over });
const member = (user_id: string, over: Record<string, unknown> = {}) => ({ user_id, club_id: 'c1', role: 'player', is_junior: false, is_active: true, joined_at: '2024-01-01', ...over });
const profile = (id: string, name: string, dob = '1985-01-01') => ({ id, full_name: name, display_name: null, date_of_birth: dob, push_token: null });
const sess = (id: string, over: Record<string, unknown> = {}) => ({ id, host_id: 'me', club_id: 'c1', kind: 'nets', age_band: 'junior', title: id, note: null, place: 'Slough CC main ground', starts_at: soon(), capacity: 10, status: 'open', responsible_adult_id: 'carla', ...over });

const world = () => memdb.reset({
  clubs: [{ id: 'c1', name: 'Slough CC', county: null, league: null, ground_lat: null, ground_lng: null }],
  club_members: [
    member('me', { role: 'coach' }), member('carla'), member('dan'), member('ed'), member('fay'), member('kid', { is_junior: true }),
    member('teen', { is_junior: true }), member('outsider', { club_id: 'c2' }),
  ],
  dbs_checks: [dbs('me'), dbs('carla'), dbs('ed', { expiry_date: '2001-01-01' }), dbs('fay', { check_type: 'basic' }), dbs('teen'), dbs('outsider')],
  profiles: [profile('me', 'Coach Carla'), profile('carla', 'Carla Adult'), profile('dan', 'Dan'), profile('ed', 'Ed'), profile('fay', 'Fay'), profile('kid', 'Kit Young', '2012-06-01'), profile('teen', 'Teen', '2009-01-01'), profile('outsider', 'Out Sider')],
  community_blocks: [],
  child_profiles: [{ linked_user_id: 'kid', parent_child_links: [{ parent_id: 'mum', verified_at: '2026-01-01' }] }],
  community_session_signups: [],
  community_sessions: [
    sess('ok'), sess('lapsed', { responsible_adult_id: 'ed' }), sess('none', { responsible_adult_id: null }),
    sess('adult', { age_band: 'adult', responsible_adult_id: null, starts_at: later() }),
  ],
});
const input = (over: Record<string, unknown> = {}) => ({ clubId: 'c1', kind: 'nets', band: 'junior', title: 'Under-12 nets', note: '', place: 'Slough CC main ground', startsAt: soon(), capacity: 8, responsibleAdultId: 'carla', ...over });
const inserts = () => memdb.writes.filter((w) => w.table === 'community_sessions' && w.op === 'insert');
beforeEach(() => { process.env.COMMUNITY_ENABLED = 'true'; world(); });

describe('creating a junior session', () => {
  it('is refused with no named responsible adult', async () => {
    const r = await createSession('me', input({ responsibleAdultId: undefined }) as never);
    expect(r.success).toBe(false);
    expect(inserts()).toHaveLength(0);
  });
  it.each([
    ['an adult with no DBS check on record', 'dan'],
    ['an adult whose enhanced check has expired', 'ed'],
    ['an adult with only a basic check', 'fay'],
    ['someone who is not a member of the club (even with a check there)', 'outsider'],
    ['a junior member', 'teen'],
    ['someone who does not exist', 'nobody'],
  ])('is refused when the named adult is %s', async (_n, who) => {
    const r = await createSession('me', input({ responsibleAdultId: who }) as never);
    expect(r.success).toBe(false);
    expect(inserts()).toHaveLength(0);
  });
  it('is saved when the named adult is a member with a current enhanced check, and records who', async () => {
    const r = await createSession('me', input() as never);
    expect(r.success).toBe(true);
    expect(inserts()[0].row).toMatchObject({ age_band: 'junior', responsible_adult_id: 'carla', status: 'open' });
  });
  it('lets the host be the responsible adult, since they hold a current check', async () => {
    expect((await createSession('me', input({ responsibleAdultId: 'me' }) as never)).success).toBe(true);
  });
  it('does not let the host be the responsible adult once their own check has expired', async () => {
    memdb.tables.dbs_checks = memdb.tables.dbs_checks.map((d) => (d.user_id === 'me' ? { ...d, expiry_date: '2001-01-01' } : d));
    expect((await createSession('me', input({ responsibleAdultId: 'me' }) as never)).success).toBe(false);
  });
  it('still needs the host to be club staff (unchanged)', async () => {
    const r = await createSession('carla', input() as never);
    expect(r.success).toBe(false);
    expect(inserts()).toHaveLength(0);
  });
  it('leaves adult sessions alone: no adult needed, none recorded', async () => {
    const r = await createSession('carla', input({ band: 'adult', responsibleAdultId: undefined }) as never);
    expect(r.success).toBe(true);
    expect(inserts()[0].row).toMatchObject({ age_band: 'adult', responsible_adult_id: null });
  });
});

describe('who can be offered in the form', () => {
  it('lists only adult members of the club with a current enhanced check, by name', async () => {
    const options = await responsibleAdultOptions(client() as never, ['c1']);
    expect(options.map((o) => o.id).sort()).toEqual(['carla', 'me']);
    expect(options.find((o) => o.id === 'carla')).toEqual({ id: 'carla', clubId: 'c1', name: 'Carla Adult' });
  });
});

describe('showing and joining junior sessions', () => {
  it('shows a junior session only while its named adult still qualifies, and names them on the card', async () => {
    const r = await listSessions('me', 'club', null);
    expect(r.success).toBe(true);
    const cards = r.success ? r.data : [];
    expect(cards.map((c) => c.id).sort()).toEqual(['adult', 'ok']);
    expect(cards.find((c) => c.id === 'ok')?.responsibleAdult).toBe('Carla Adult');
    expect(cards.find((c) => c.id === 'adult')?.responsibleAdult).toBeNull();
  });
  it('lets a junior of the club join one with a qualifying adult', async () => {
    expect((await joinSession('kid', 'ok', true)).success).toBe(true);
  });
  it.each([['an adult whose check has lapsed', 'lapsed'], ['a session with no named adult', 'none']])('refuses a junior joining %s', async (_n, id) => {
    const r = await joinSession('kid', id, true);
    expect(r.success).toBe(false);
    expect(memdb.writes.filter((w) => w.table === 'community_session_signups')).toHaveLength(0);
  });
});
