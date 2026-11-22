type Op = [string, ...unknown[]];
const writes: Array<{ table: string; op: string; args: unknown[] }> = [];
let db: Record<string, (ops: Op[]) => unknown[]> = {};
const has = (ops: Op[], m: string, col: string, val?: unknown) => ops.some((o) => o[0] === m && o[1] === col && (val === undefined || o[2] === val));
const makeChain = (table: string) => {
  const ops: Op[] = [];
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'or', 'gt', 'order', 'limit', 'maybeSingle', 'single']) c[m] = (...a: unknown[]) => { ops.push([m, ...a]); return c; };
  for (const op of ['insert', 'update', 'upsert', 'delete']) c[op] = (...a: unknown[]) => { writes.push({ table, op, args: a }); ops.push([op]); return c; };
  c.then = (res: (v: unknown) => unknown) => { const rows = (db[table] ?? (() => []))(ops); res({ data: ops.some((o) => o[0] === 'maybeSingle' || o[0] === 'single') ? rows[0] ?? null : rows, count: rows.length, error: null }); };
  return c;
};
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => makeChain(t) }) }));
const mockCheck = jest.fn(async () => ({ status: 'live' as const }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: (...a: unknown[]) => (mockCheck as unknown as (...x: unknown[]) => unknown)(...a) }));
(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: true });

import { createSession } from '@/lib/community/sessions';

const soon = () => new Date(Date.now() + 3 * 86400000).toISOString();
const world = () => {
  writes.length = 0; mockCheck.mockClear();
  db = {
    club_members: (ops) => {
      if (has(ops, 'in', 'role')) return [{ role: 'coach' }];
      return [{ user_id: 'me', club_id: 'c1', role: 'coach', is_junior: false, is_active: true }];
    },
    clubs: () => [{ id: 'c1', name: 'Slough CC', county: null, league: null, ground_lat: null, ground_lng: null }],
    profiles: () => [{ id: 'me', full_name: 'Coach Carla', display_name: null, push_token: null }],
    community_blocks: () => [],
    community_sessions: () => [{ id: 's1' }],
  };
};
const input = () => ({ clubId: 'c1', kind: 'nets', band: 'adult', title: 'Tuesday nets', note: 'Bring a bat', place: 'Slough CC main ground', startsAt: soon(), capacity: 8 });
beforeEach(() => { process.env.COMMUNITY_ENABLED = 'true'; });

describe('createSession and the safety check', () => {
  it('saves a cleared session as open', async () => {
    world();
    const r = await createSession('me', input() as never);
    expect(r.success).toBe(true);
    expect(r.success && r.data.held).toBe(false);
    expect(writes.find((w) => w.op === 'insert')?.args[0]).toMatchObject({ status: 'open', held_reason: null });
  });
  it('queues the session for staff, instead of refusing it, when the AI check is unavailable', async () => {
    world(); mockCheck.mockResolvedValueOnce({ status: 'held' as never, tell: 'The safety check is busy.', held: true } as never);
    const r = await createSession('me', input() as never);
    expect(r.success).toBe(true);
    expect(r.success && r.data.held).toBe(true);
    expect(r.success && r.data.id).toBeTruthy();
    expect(writes.find((w) => w.op === 'insert')?.args[0]).toMatchObject({ status: 'held', held_reason: 'The safety check is busy.' });
  });
  it('still refuses, and stores nothing, when a plain rule stops it', async () => {
    world(); mockCheck.mockResolvedValueOnce({ status: 'held' as never, tell: 'No contact details', held: false } as never);
    const r = await createSession('me', input() as never);
    expect(r.success).toBe(true);
    expect(r.success && r.data.id).toBeNull();
    expect(writes.filter((w) => w.op === 'insert')).toHaveLength(0);
  });
});
