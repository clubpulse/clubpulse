// These tests are about how under-18s behave when the Community is open to them
process.env.COMMUNITY_JUNIORS_ENABLED = 'true';
type Op = [string, ...unknown[]];
const writes: Array<{ table: string; op: string; args: unknown[] }> = [];
let db: Record<string, (ops: Op[]) => unknown[]> = {};
const has = (ops: Op[], m: string, col: string, val?: unknown) => ops.some((o) => o[0] === m && o[1] === col && (val === undefined || o[2] === val || (Array.isArray(o[2]) && (o[2] as unknown[]).includes(val))));

const makeChain = (table: string) => {
  const ops: Op[] = [];
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'or', 'not', 'is', 'gte', 'order', 'limit', 'maybeSingle']) c[m] = (...a: unknown[]) => { ops.push([m, ...a]); return c; };
  for (const op of ['insert', 'update', 'upsert']) c[op] = (...a: unknown[]) => { writes.push({ table, op, args: a }); ops.push([op]); return c; };
  c.then = (res: (v: unknown) => unknown) => {
    const rows = (db[table] ?? (() => []))(ops);
    const single = ops.some((o) => o[0] === 'maybeSingle');
    res({ data: single ? rows[0] ?? null : rows, count: rows.length, error: null });
  };
  return c;
};
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => makeChain(t) }) }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: jest.fn(async () => ({ status: 'live' })) }));
(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: true });

import { checkEligibility, crossBandOpen, decideAsParent, answerAsJunior, getParentThread, guardianContactActive, requestJunior } from '@/lib/community/guardian';
import { dbsIsCurrent, guardianBlock } from '@/lib/community/rules';
import { getMessages, sendMessage } from '@/lib/community/service';
import { createAdminClient } from '@/lib/supabase/admin';

const ADULT = 'coach1'; const KID = 'kid1'; const PARENT = 'mum1';
const future = '2099-01-01'; const past = '2020-01-01';

type World = { dbs?: Array<{ club_id: string; check_type: string; status: string; expiry_date: string | null }>; coachRole?: string; parents?: string[]; requests?: Array<Record<string, unknown>>; declinedRecently?: boolean; pendingCount?: number };
const world = (w: World = {}) => {
  writes.length = 0;
  const parents = w.parents ?? [PARENT];
  db = {
    profiles: () => [{ id: ADULT, full_name: 'Carl Coach', push_token: null, date_of_birth: '1985-01-01' }, { id: KID, full_name: 'Kit Young', push_token: null, date_of_birth: '2015-01-01' }],
    club_members: (ops) => {
      if (has(ops, 'in', 'user_id')) return [
        { user_id: ADULT, club_id: 'c1', role: w.coachRole ?? 'coach', is_junior: false, is_active: true },
        { user_id: KID, club_id: 'c1', role: 'member', is_junior: true, is_active: true }];
      if (has(ops, 'eq', 'user_id', ADULT)) return [{ club_id: 'c1', role: w.coachRole ?? 'coach' }];
      return [{ club_id: 'c1', role: 'member' }];
    },
    clubs: () => [{ id: 'c1', name: 'Slough CC' }],
    dbs_checks: () => w.dbs ?? [{ club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: future }],
    child_profiles: () => parents.length ? [{ linked_user_id: KID, parent_child_links: parents.map((p) => ({ parent_id: p, verified_at: 'x' })) }] : [],
    community_blocks: () => [],
    community_guardian_requests: (ops) => {
      if (has(ops, 'eq', 'status', 'declined') && ops.some((o) => o[0] === 'gte')) return w.declinedRecently ? [{ id: 'old' }] : [];
      if (has(ops, 'eq', 'status', 'pending_parent') && ops.some((o) => o[0] === 'select' && typeof o[2] === 'object')) return Array.from({ length: w.pendingCount ?? 0 }, () => ({}));
      // Like the database: a query for one status only gets rows with that status
      const st = ops.find((o) => o[0] === 'eq' && o[1] === 'status')?.[2];
      return (w.requests ?? []).filter((r) => !st || r.status === st);
    },
    community_connections: () => [{ id: 'conn1' }],
    community_messages: () => [{ id: 'm1', sender_id: ADULT, body: 'Great session', created_at: 'now' }],
  };
};
const req = (status: string, extra: Record<string, unknown> = {}) => ({ id: 'r1', adult_id: ADULT, junior_id: KID, club_id: 'c1', note: null, status, connection_id: 'conn1', created_at: 'now', ...extra });
const wrote = (table: string, op?: string) => writes.filter((x) => x.table === table && (!op || x.op === op));

beforeEach(() => { process.env.COMMUNITY_ENABLED = 'true'; process.env.COMMUNITY_CROSSBAND_ENABLED = 'true'; });
afterAll(() => { delete process.env.COMMUNITY_ENABLED; delete process.env.COMMUNITY_CROSSBAND_ENABLED; });

describe('rules', () => {
  it('counts only a valid enhanced DBS that has not expired', () => {
    const row = (o: Partial<{ check_type: string; status: string; expiry_date: string | null }>) => ({ check_type: 'enhanced', status: 'valid', expiry_date: future, ...o });
    expect(dbsIsCurrent([row({})], '2026-11-22')).toBe(true);
    expect(dbsIsCurrent([row({ check_type: 'enhanced_barred' })], '2026-11-22')).toBe(true);
    expect(dbsIsCurrent([row({ expiry_date: null })], '2026-11-22')).toBe(true);
    expect(dbsIsCurrent([row({ expiry_date: past })], '2026-11-22')).toBe(false);
    expect(dbsIsCurrent([row({ status: 'pending' })], '2026-11-22')).toBe(false);
    expect(dbsIsCurrent([row({ check_type: 'basic' }), row({ check_type: 'standard' })], '2026-11-22')).toBe(false);
  });
  it('names the first thing missing', () => {
    const ok = { adultJunior: false, subjectJunior: true, staffOfSharedClub: true, currentDbs: true, juniorHasParent: true };
    expect(guardianBlock(ok)).toBeNull();
    expect(guardianBlock({ ...ok, adultJunior: true })).toMatch(/adult/);
    expect(guardianBlock({ ...ok, subjectJunior: false })).toMatch(/adult/);
    expect(guardianBlock({ ...ok, staffOfSharedClub: false })).toMatch(/coach or club admin/);
    expect(guardianBlock({ ...ok, currentDbs: false })).toMatch(/DBS/);
    expect(guardianBlock({ ...ok, juniorHasParent: false })).toMatch(/parent/);
  });
});

describe('the flag', () => {
  it('is off unless both flags are exactly "true"', () => {
    process.env.COMMUNITY_CROSSBAND_ENABLED = 'yes'; expect(crossBandOpen()).toBe(false);
    process.env.COMMUNITY_CROSSBAND_ENABLED = 'true'; process.env.COMMUNITY_ENABLED = 'false'; expect(crossBandOpen()).toBe(false);
  });
  it('refuses everything while off and writes nothing', async () => {
    delete process.env.COMMUNITY_CROSSBAND_ENABLED; world();
    expect((await requestJunior(ADULT, KID, '')).success).toBe(false);
    expect((await decideAsParent(PARENT, 'r1', true)).success).toBe(false);
    expect(await guardianContactActive(createAdminClient(), ADULT, KID)).toBe(false);
    expect(writes).toHaveLength(0);
  });
});

describe('asking', () => {
  it('goes to the parent, never the young person, and is logged', async () => {
    world(); db.community_guardian_requests = (ops) => (ops.some((o) => o[0] === 'insert') ? [{ id: 'r1' }] : []);
    const r = await requestJunior(ADULT, KID, 'Happy to help with his batting');
    expect(r.success).toBe(true);
    const notified = wrote('community_notifications', 'insert').map((w) => w.args[0] as { user_id: string; kind: string });
    expect(notified).toEqual([expect.objectContaining({ user_id: PARENT, kind: 'guardian_request' })]);
    expect(notified.some((n) => n.user_id === KID)).toBe(false);
    expect(wrote('community_guardian_events', 'insert')[0].args[0]).toMatchObject({ event: 'requested', actor_id: ADULT });
  });
  it('is refused without a shared club role, a current DBS or a verified parent', async () => {
    world({ coachRole: 'member' }); expect((await requestJunior(ADULT, KID, '')).success).toBe(false);
    world({ dbs: [{ club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: past }] }); expect((await requestJunior(ADULT, KID, '')).success).toBe(false);
    world({ dbs: [{ club_id: 'c1', check_type: 'basic', status: 'valid', expiry_date: future }] }); expect((await requestJunior(ADULT, KID, '')).success).toBe(false);
    world({ parents: [] }); expect((await requestJunior(ADULT, KID, '')).success).toBe(false);
    expect(wrote('community_guardian_requests', 'insert')).toHaveLength(0);
  });
  it('is refused again for 90 days after a parent said no, and when too many are waiting', async () => {
    world({ declinedRecently: true }); expect((await requestJunior(ADULT, KID, '')).success).toBe(false);
    world({ pendingCount: 5 }); expect((await requestJunior(ADULT, KID, '')).success).toBe(false);
    expect(wrote('community_guardian_requests', 'insert')).toHaveLength(0);
  });
  it('does not let a junior ask anyone', async () => {
    world(); const e = await checkEligibility(createAdminClient(), KID, ADULT);
    expect(e.ok).toBe(false);
  });
});

describe('the parent decides first', () => {
  it('only a verified linked parent can decide', async () => {
    world({ requests: [req('pending_parent')] });
    expect((await decideAsParent('stranger', 'r1', true)).success).toBe(false);
    expect(wrote('community_connections', 'insert')).toHaveLength(0);
  });
  it('approving opens a pending connection and asks the junior; declining asks nobody', async () => {
    world({ requests: [req('pending_parent')] });
    expect((await decideAsParent(PARENT, 'r1', true)).success).toBe(true);
    expect(wrote('community_connections', 'insert')[0].args[0]).toEqual({ requester_id: ADULT, addressee_id: KID });
    expect(wrote('community_guardian_requests', 'update')[0].args[0]).toMatchObject({ status: 'pending_junior', decided_by: PARENT });
    expect(wrote('community_notifications', 'insert').map((w) => (w.args[0] as { user_id: string }).user_id)).toEqual([KID]);
    world({ requests: [req('pending_parent')] });
    await decideAsParent(PARENT, 'r1', false);
    expect(wrote('community_connections')).toHaveLength(0);
    expect(wrote('community_notifications')).toHaveLength(0);
  });
  it('approving fails if the adult\'s DBS has lapsed since they asked', async () => {
    world({ requests: [req('pending_parent')], dbs: [{ club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: past }] });
    expect((await decideAsParent(PARENT, 'r1', true)).success).toBe(false);
    expect(wrote('community_connections')).toHaveLength(0);
  });
});

describe('the junior answers second', () => {
  it('has no route to an adult without an approved request', async () => {
    world({ requests: [] });
    expect(await answerAsJunior(createAdminClient(), KID, ADULT, true)).toBeNull();
    expect(wrote('community_connections')).toHaveLength(0);
  });
  it('accepting makes it active and tells the adult and the parent', async () => {
    world({ requests: [req('pending_junior')] });
    const r = await answerAsJunior(createAdminClient(), KID, ADULT, true);
    expect(r && r.success && r.data.link).toBe('connected');
    expect(wrote('community_guardian_requests', 'update')[0].args[0]).toEqual({ status: 'active' });
    expect(wrote('community_connections', 'update')[0].args[0]).toMatchObject({ status: 'accepted' });
    expect(wrote('community_notifications', 'insert').map((w) => (w.args[0] as { user_id: string }).user_id).sort()).toEqual([ADULT, PARENT].sort());
  });
  it('declining closes it', async () => {
    world({ requests: [req('pending_junior')] });
    const r = await answerAsJunior(createAdminClient(), KID, ADULT, false);
    expect(r && r.success && r.data.link).toBe('passed');
    expect(wrote('community_guardian_requests', 'update')[0].args[0]).toEqual({ status: 'declined' });
  });
});

describe('the conversation', () => {
  it('is allowed only while active and the adult is still eligible', async () => {
    world({ requests: [req('active')] });
    expect(await guardianContactActive(createAdminClient(), ADULT, KID)).toBe(true);
    world({ requests: [req('active')], dbs: [{ club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: past }] });
    expect(await guardianContactActive(createAdminClient(), ADULT, KID)).toBe(false);
    world({ requests: [] });
    expect(await guardianContactActive(createAdminClient(), ADULT, KID)).toBe(false);
  });
  it('can be read by the linked parent, and every read is logged', async () => {
    world({ requests: [req('active')] });
    const r = await getParentThread(PARENT, 'r1');
    expect(r.success && r.data.messages).toEqual([expect.objectContaining({ body: 'Great session', fromAdult: true })]);
    expect(wrote('community_guardian_events', 'insert')[0].args[0]).toMatchObject({ event: 'thread_read', actor_id: PARENT });
  });
  it('cannot be read by anyone else', async () => {
    world({ requests: [req('active')] });
    expect((await getParentThread('stranger', 'r1')).success).toBe(false);
    world({ requests: [req('pending_junior')] });
    expect((await getParentThread(PARENT, 'r1')).success).toBe(false);
  });
});

describe('private messages across the age line', () => {
  const thread = (requests: Array<Record<string, unknown>>) => {
    world({ requests });
    db.community_connections = () => [{ id: 'conn1', requester_id: ADULT, addressee_id: KID, status: 'accepted' }];
  };
  it('are refused without an active, approved contact, even on an accepted connection', async () => {
    thread([]);
    expect((await getMessages(KID, 'conn1')).success).toBe(false);
    expect((await sendMessage(ADULT, 'conn1', 'hello')).success).toBe(false);
    expect(wrote('community_messages', 'insert')).toHaveLength(0);
    thread([req('pending_junior')]);
    expect((await sendMessage(ADULT, 'conn1', 'hello')).success).toBe(false);
  });
  it('stay off for under-18s whatever the contact says, until COMMUNITY_JUNIOR_DMS is true', async () => {
    thread([req('active')]);
    delete process.env.COMMUNITY_JUNIOR_DMS;
    const read = await getMessages(KID, 'conn1');
    expect(read).toEqual({ success: false, error: 'Private messages are not available for under-18s yet.' });
    expect((await sendMessage(KID, 'conn1', 'hi')).success).toBe(false);
    expect((await sendMessage(ADULT, 'conn1', 'hello')).success).toBe(false);
    expect(wrote('community_messages', 'insert')).toHaveLength(0);
  });
  it('work once the contact is active, and stop when the flag is off', async () => {
    process.env.COMMUNITY_JUNIOR_DMS = 'true';
    thread([req('active')]);
    expect((await getMessages(KID, 'conn1')).success).toBe(true);
    expect((await sendMessage(ADULT, 'conn1', 'See you at nets')).success).toBe(true);
    expect(wrote('community_messages', 'insert')).toHaveLength(1);
    delete process.env.COMMUNITY_CROSSBAND_ENABLED;
    expect((await getMessages(KID, 'conn1')).success).toBe(false);
    delete process.env.COMMUNITY_JUNIOR_DMS;
  });
});
