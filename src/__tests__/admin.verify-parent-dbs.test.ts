// Verifying a parent link makes that person a "verified parent" who can approve their child's Community connections,
// so both ways of doing it (the web route and the mobile approval queue) need an admin with a current enhanced DBS.
type Op = [string, ...unknown[]];
const writes: Array<{ table: string; op: string; args: unknown[] }> = [];
let db: Record<string, (ops: Op[]) => unknown[]> = {};
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const ops: Op[] = [];
      const c: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'limit', 'order', 'maybeSingle', 'single']) c[m] = (...a: unknown[]) => { ops.push([m, ...a]); return c; };
      c.update = (...a: unknown[]) => { writes.push({ table, op: 'update', args: a }); ops.push(['update']); return c; };
      c.then = (res: (v: unknown) => unknown) => {
        const rows = (db[table] ?? (() => []))(ops);
        const single = ops.some((o) => o[0] === 'maybeSingle' || o[0] === 'single');
        res({ data: single ? rows[0] ?? null : rows, error: null });
      };
      return c;
    },
  }),
}));
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/supabase/request-auth', () => ({ getRequestAuth: async () => ({ user: { id: 'admin1' } }) }));

import { PATCH } from '@/app/api/club/children/route';
import { approveRequest } from '@/lib/mobile/club-data';
import { VERIFY_NEEDS_DBS } from '@/lib/admin/child-link';
import { NextRequest } from 'next/server';

const LINK = '11111111-1111-4111-8111-111111111111';
const DBS_OK = [{ club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: '2999-01-01' }];
const world = (dbs: unknown[]) => {
  writes.length = 0;
  db = {
    club_members: () => [{ club_id: 'c1' }],
    parent_child_links: () => [{ id: LINK, child_profiles: { club_id: 'c1' } }],
    dbs_checks: () => dbs,
  };
};
const patch = () => PATCH(new NextRequest('http://x/api/club/children', { method: 'PATCH', body: JSON.stringify({ linkId: LINK }) }));
const linkWrites = () => writes.filter((w) => w.table === 'parent_child_links');

describe('verifying a parent link on the web', () => {
  it('works for an admin with a current enhanced DBS check', async () => {
    world(DBS_OK);
    expect((await patch()).status).toBe(200);
    expect(linkWrites()).toHaveLength(1);
  });
  it.each([
    ['no check on record', []],
    ['a check that is not valid', [{ ...DBS_OK[0], status: 'pending' }]],
    ['a check that has expired', [{ ...DBS_OK[0], expiry_date: '2001-01-01' }]],
    ['a basic check only', [{ ...DBS_OK[0], check_type: 'basic' }]],
  ])('refuses an admin with %s, and writes nothing', async (_n, dbs) => {
    world(dbs);
    const res = await patch();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(VERIFY_NEEDS_DBS);
    expect(linkWrites()).toHaveLength(0);
  });
});

describe('verifying a parent link from the mobile approval queue', () => {
  it('works for an admin with a current enhanced DBS check', async () => {
    world(DBS_OK);
    expect(await approveRequest('admin1', `link:${LINK}`)).toEqual({ success: true, data: null });
    expect(linkWrites()).toHaveLength(1);
  });
  it('refuses an admin with no current check, and writes nothing', async () => {
    world([]);
    expect(await approveRequest('admin1', `link:${LINK}`)).toEqual({ success: false, error: VERIFY_NEEDS_DBS });
    expect(linkWrites()).toHaveLength(0);
  });
});
