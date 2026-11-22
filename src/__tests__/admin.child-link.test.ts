type Op = [string, ...unknown[]];
const writes: Array<{ table: string; op: string; args: unknown[] }> = [];
let db: Record<string, (ops: Op[]) => unknown[]> = {};
const has = (ops: Op[], m: string, col: string, val?: unknown) => ops.some((o) => o[0] === m && o[1] === col && (val === undefined || o[2] === val));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const ops: Op[] = [];
      const c: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'ilike', 'limit', 'maybeSingle']) c[m] = (...a: unknown[]) => { ops.push([m, ...a]); return c; };
      c.update = (...a: unknown[]) => { writes.push({ table, op: 'update', args: a }); ops.push(['update']); return c; };
      c.then = (res: (v: unknown) => unknown) => { const rows = (db[table] ?? (() => []))(ops); res({ data: ops.some((o) => o[0] === 'maybeSingle') ? rows[0] ?? null : rows, error: null }); };
      return c;
    },
  }),
}));
import { clubsWithCurrentDbs, linkChildToAccount, unlinkChildAccount } from '@/lib/admin/child-link';

const kid = { id: 'k1', club_id: 'c1', first_name: 'Kit', date_of_birth: '2013-05-01', linked_user_id: null };
const world = (o: { child?: Record<string, unknown> | null; profile?: boolean; member?: boolean; taken?: boolean } = {}) => {
  writes.length = 0;
  db = {
    child_profiles: (ops) => has(ops, 'neq', 'id') ? (o.taken ? [{ id: 'other' }] : []) : (o.child === null ? [] : [o.child ?? kid]),
    profiles: () => (o.profile === false ? [] : [{ id: 'u1', full_name: 'Kit Smith', display_name: 'Kit' }]),
    club_members: () => (o.member === false ? [] : [{ id: 'm1' }]),
  };
};

describe('linkChildToAccount', () => {
  it('links, and marks the member as a junior in that club', async () => {
    world();
    const r = await linkChildToAccount(['c1'], 'k1', 'kit@example.com');
    expect(r).toEqual({ success: true, name: 'Kit' });
    expect(writes).toContainEqual({ table: 'child_profiles', op: 'update', args: [{ linked_user_id: 'u1' }] });
    expect(writes).toContainEqual({ table: 'club_members', op: 'update', args: [{ is_junior: true }] });
  });
  it('will not touch a child at a club the admin does not run', async () => {
    world();
    const r = await linkChildToAccount(['other-club'], 'k1', 'kit@example.com');
    expect(r.success).toBe(false);
    expect(writes).toHaveLength(0);
  });
  it('refuses a record for someone aged 18 or over', async () => {
    world({ child: { ...kid, date_of_birth: '2000-01-01' } });
    expect((await linkChildToAccount(['c1'], 'k1', 'a@b.com')).success).toBe(false);
    expect(writes).toHaveLength(0);
  });
  it('says the same thing for an unknown email and for someone outside the club', async () => {
    world({ profile: false });
    const a = await linkChildToAccount(['c1'], 'k1', 'nobody@example.com');
    world({ member: false });
    const b = await linkChildToAccount(['c1'], 'k1', 'outsider@example.com');
    expect(a).toEqual(b);
    expect(a.success).toBe(false);
    expect(writes).toHaveLength(0);
  });
  it('refuses an account already linked to another child record', async () => {
    world({ taken: true });
    const r = await linkChildToAccount(['c1'], 'k1', 'kit@example.com');
    expect(r.success).toBe(false);
    expect(writes).toHaveLength(0);
  });
  it('rejects a bad email or child id without writing', async () => {
    world();
    expect((await linkChildToAccount(['c1'], 'k1', 'not-an-email')).success).toBe(false);
    expect((await linkChildToAccount(['c1'], 5, 'a@b.com')).success).toBe(false);
    expect(writes).toHaveLength(0);
  });
});

describe('unlinkChildAccount', () => {
  it('clears the link for a child of the admin\'s own club only', async () => {
    world();
    expect((await unlinkChildAccount(['c1'], 'k1')).success).toBe(true);
    expect(writes).toContainEqual({ table: 'child_profiles', op: 'update', args: [{ linked_user_id: null }] });
    writes.length = 0;
    expect((await unlinkChildAccount(['nope'], 'k1')).success).toBe(false);
    expect(writes).toHaveLength(0);
  });
});

describe('clubsWithCurrentDbs', () => {
  const dbs = (rows: Array<Record<string, unknown>>) => { db = { dbs_checks: () => rows }; };
  it('keeps only the clubs where the admin holds a current enhanced check', async () => {
    dbs([
      { club_id: 'c1', check_type: 'enhanced', status: 'valid', expiry_date: '2099-01-01' },
      { club_id: 'c2', check_type: 'enhanced', status: 'valid', expiry_date: '2020-01-01' },
      { club_id: 'c3', check_type: 'basic', status: 'valid', expiry_date: '2099-01-01' },
      { club_id: 'c4', check_type: 'enhanced', status: 'pending', expiry_date: '2099-01-01' },
    ]);
    expect(await clubsWithCurrentDbs('u', ['c1', 'c2', 'c3', 'c4', 'c5'])).toEqual(['c1']);
  });
  it('is empty with no clubs or no checks', async () => {
    dbs([]);
    expect(await clubsWithCurrentDbs('u', ['c1'])).toEqual([]);
    expect(await clubsWithCurrentDbs('u', [])).toEqual([]);
  });
});
