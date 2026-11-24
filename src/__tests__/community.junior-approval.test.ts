// These tests are about how under-18s behave when the Community is open to them
process.env.COMMUNITY_JUNIORS_ENABLED = 'true';
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const db: Record<string, Row[]> = {};
const written: Array<{ table: string; op: string; row: Row }> = [];
const makeChain = (table: string) => {
  const filters: Array<(r: Row) => boolean> = []; let one = false;
  const c: Record<string, unknown> = {};
  c.select = () => c; c.not = () => c; c.or = () => c; c.order = () => c; c.limit = () => c;
  c.eq = (k: string, v: unknown) => { filters.push((r) => r[k] === v); return c; };
  c.in = (k: string, v: unknown[]) => { filters.push((r) => v.includes(r[k])); return c; };
  c.maybeSingle = () => { one = true; return c; };
  for (const op of ['insert', 'update', 'upsert']) c[op] = (row: Row) => {
    written.push({ table, op, row });
    if (op === 'upsert') { const d = (db[table] ??= []); const k = d.findIndex((r) => r.connection_id === row.connection_id && r.parent_id === row.parent_id && r.junior_id === row.junior_id); if (k >= 0) d[k] = row; else d.push(row); }
    if (op === 'update') c._upd = row;
    return c;
  };
  c.then = (res: (v: unknown) => unknown) => {
    const rows = (db[table] ?? []).filter((r) => filters.every((f) => f(r)));
    if (c._upd) for (const r of rows) Object.assign(r, c._upd);
    return res({ data: one ? rows[0] ?? null : rows, error: null });
  };
  return c;
};
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => makeChain(t) }) }));
(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: true });

import { decideJuniorConnection, getApprovalsForParent, outcome } from '@/lib/community/junior-approval';

const A = 'kidA', B = 'kidB';
const link = (parent: string, child: string, uid: string, verified: string | null = 'x') => ({ parent_id: parent, child_id: child, verified_at: verified, child_profiles: { id: child, first_name: child, linked_user_id: uid } });
beforeEach(() => {
  written.length = 0;
  db.community_connections = [{ id: 'c1', requester_id: A, addressee_id: B, status: 'awaiting_parents' }];
  db.community_connection_approvals = [];
  db.community_connection_events = [];
  db.community_notifications = [];
  db.parent_child_links = [link('mumA', 'chA', A), link('dadA', 'chA', A), link('mumB', 'chB', B), link('stranger', 'chX', 'someoneElse')];
  db.child_profiles = [
    { id: 'chA', linked_user_id: A, parent_child_links: [{ parent_id: 'mumA', verified_at: 'x' }, { parent_id: 'dadA', verified_at: 'x' }] },
    { id: 'chB', linked_user_id: B, parent_child_links: [{ parent_id: 'mumB', verified_at: 'x' }] },
  ];
  db.profiles = [{ id: A, full_name: 'Amy Ng', date_of_birth: '2012-01-01' }, { id: B, full_name: 'Ben Ode', date_of_birth: '2012-01-01' }];
  db.club_members = [{ user_id: A, club_id: 'c', role: 'member', is_junior: true, is_active: true }, { user_id: B, club_id: 'c', role: 'member', is_junior: true, is_active: true }];
  db.clubs = [{ id: 'c', name: 'Slough CC' }];
});
const status = () => db.community_connections[0].status;

describe('outcome', () => {
  it('opens only when every child has an approving parent, and any decline closes it', () => {
    expect(outcome([A, B], [])).toBe('waiting');
    expect(outcome([A, B], [{ junior_id: A, decision: 'approved' }])).toBe('waiting');
    expect(outcome([A, B], [{ junior_id: A, decision: 'approved' }, { junior_id: B, decision: 'approved' }])).toBe('approved');
    expect(outcome([A, B], [{ junior_id: A, decision: 'approved' }, { junior_id: A, decision: 'declined' }])).toBe('declined');
    expect(outcome([A, B], [{ junior_id: B, decision: 'declined' }])).toBe('declined');
  });
});

describe('decideJuniorConnection', () => {
  it('stays closed after one child’s parent approves, and opens after the other’s', async () => {
    let r = await decideJuniorConnection('mumA', 'c1', 'chA', true);
    expect(r.success && r.data.state).toBe('waiting');
    expect(status()).toBe('awaiting_parents');
    r = await decideJuniorConnection('mumB', 'c1', 'chB', true);
    expect(r.success && r.data.state).toBe('opened');
    expect(status()).toBe('accepted');
  });
  it('is closed by any parent declining, even after the other child’s parent approved', async () => {
    await decideJuniorConnection('mumA', 'c1', 'chA', true);
    const r = await decideJuniorConnection('mumB', 'c1', 'chB', false);
    expect(r.success && r.data.state).toBe('declined');
    expect(status()).toBe('declined');
  });
  it('lets a second parent of the same child decline after the first approved', async () => {
    await decideJuniorConnection('mumA', 'c1', 'chA', true);
    const r = await decideJuniorConnection('dadA', 'c1', 'chA', false);
    expect(r.success && r.data.state).toBe('declined');
  });
  it('refuses anyone who is not a verified parent of one of the two children, and changes nothing', async () => {
    for (const [parent, child] of [['stranger', 'chX'], ['stranger', 'chA'], ['mumA', 'chB']] as const) {
      const r = await decideJuniorConnection(parent, 'c1', child, true);
      expect(r.success).toBe(false);
    }
    db.parent_child_links.push(link('unverified', 'chA', A, null));
    expect((await decideJuniorConnection('unverified', 'c1', 'chA', true)).success).toBe(false);
    expect(status()).toBe('awaiting_parents');
    expect(db.community_connection_approvals).toHaveLength(0);
  });
  it('refuses a connection that is not waiting on parents', async () => {
    db.community_connections[0].status = 'pending';
    expect((await decideJuniorConnection('mumA', 'c1', 'chA', true)).success).toBe(false);
    expect((await decideJuniorConnection('mumA', 42, 'chA', true)).success).toBe(false);
  });
});

describe('getApprovalsForParent', () => {
  it('lists what waits on this parent, with the other child shown by first name only, and marks what they approved', async () => {
    let r = await getApprovalsForParent('mumA');
    expect(r.success && r.data).toEqual([expect.objectContaining({ connectionId: 'c1', childId: 'chA', childName: 'chA', decided: null })]);
    await decideJuniorConnection('mumA', 'c1', 'chA', true);
    r = await getApprovalsForParent('mumA');
    expect(r.success && r.data[0].decided).toBe('approved');
    expect(await getApprovalsForParent('stranger')).toEqual({ success: true, data: [] });
  });
});
