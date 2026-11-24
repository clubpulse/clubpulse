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
      for (const m of ['select', 'eq', 'in', 'limit', 'order', 'maybeSingle', 'single', 'not']) c[m] = (...a: unknown[]) => { ops.push([m, ...a]); return c; };
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
const ADULT = { date_of_birth: '1985-04-12' };
// club_members serves both the admin lookups (club_id) and the parent's junior mark (is_junior)
const world = (dbs: unknown[], parent: Record<string, unknown>[] = [ADULT], parentMembers: Array<{ is_junior: boolean }> = [{ is_junior: false }]) => {
  writes.length = 0;
  db = {
    club_members: (ops) => (ops.some((o) => o[0] === 'eq' && o[1] === 'user_id' && o[2] === 'parent1') ? parentMembers : [{ club_id: 'c1' }]),
    parent_child_links: () => [{ id: LINK, parent_id: 'parent1', child_profiles: { club_id: 'c1' } }],
    dbs_checks: () => dbs,
    profiles: () => parent,
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

describe('the parent has to be an adult', () => {
  const JUNIOR_ISH = [{ is_junior: true }];
  const cases: Array<[string, Record<string, unknown>[], Array<{ is_junior: boolean }>, string]> = [
    ['no date of birth', [{ date_of_birth: null }], [{ is_junior: false }], 'no date of birth'],
    ['no profile row at all', [], [{ is_junior: false }], 'no date of birth'],
    ['an impossible date', [{ date_of_birth: '2999-01-01' }], [{ is_junior: false }], 'not valid'],
    ['a date over 110 years ago', [{ date_of_birth: '1800-01-01' }], [{ is_junior: false }], 'not valid'],
    ['under 18', [{ date_of_birth: '2012-06-01' }], [{ is_junior: false }], 'under 18'],
    ['a declared adult date but marked a junior by the club', [ADULT], JUNIOR_ISH, 'under 18'],
  ];
  it.each(cases)('refuses a parent account with %s, on the web and on mobile, and writes nothing', async (_n, parent, members, text) => {
    world(DBS_OK, parent, members);
    const res = await patch();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain(text);
    expect(await approveRequest('admin1', `link:${LINK}`)).toEqual({ success: false, error: expect.stringContaining(text) });
    expect(linkWrites()).toHaveLength(0);
  });
  it('lets an adult through when the club has marked them junior at one club but not another', async () => {
    world(DBS_OK, [ADULT], [{ is_junior: true }, { is_junior: false }]);
    expect((await patch()).status).toBe(200);
  });
  it('checks the admin first: no DBS wins over the parent problem', async () => {
    world([], [{ date_of_birth: null }]);
    expect((await (await patch()).json()).error).toBe(VERIFY_NEEDS_DBS);
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
