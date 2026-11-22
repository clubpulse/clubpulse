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

import { listShortages, postShortage, replyToShortage, getReplies, closeShortage } from '@/lib/community/shortages';
import { checkShortageWhen, mayPostShortage, maySeeShortage } from '@/lib/community/rules';

const soon = () => new Date(Date.now() + 3 * 86400000).toISOString();
const world = (o: { junior?: boolean; staff?: boolean; shortage?: Record<string, unknown> | null } = {}) => {
  writes.length = 0; mockCheck.mockClear();
  db = {
    club_members: (ops) => {
      if (has(ops, 'in', 'role')) return o.staff === false ? [] : [{ role: 'club_admin' }];
      if (has(ops, 'in', 'user_id')) return [{ user_id: 'me', club_id: 'c1', role: 'member', is_junior: !!o.junior, is_active: true }, { user_id: 'p', club_id: 'c2', role: 'member', is_junior: false, is_active: true }];
      return [{ club_id: 'c1', role: 'member', is_junior: !!o.junior }];
    },
    clubs: () => [{ id: 'c1', name: 'Slough CC', county: null, league: null, ground_lat: null, ground_lng: null }, { id: 'c2', name: 'Eton CC', county: null, league: null, ground_lat: null, ground_lng: null }],
    profiles: () => [{ id: 'me', full_name: 'Mo Player', display_name: null, push_token: null }, { id: 'p', full_name: 'Pat Poster', display_name: null, push_token: null }],
    community_blocks: () => [],
    community_shortages: (ops) => ops.some((x) => x[0] === 'select' && typeof x[1] === 'string' && x[1].includes('posted_by') && !x[1].includes('play_at') && !x[1].includes('format'))
      ? (o.shortage ? [o.shortage] : []) : (o.shortage === undefined ? [{ id: 's1', club_id: 'c2', posted_by: 'p', play_at: soon(), format: 'league', need: 2, place: 'Eton ground', note: 'Bring whites', status: 'open' }] : o.shortage ? [o.shortage] : []),
    community_shortage_replies: () => [{ shortage_id: 's1', user_id: 'me' }],
  };
};
beforeEach(() => { process.env.COMMUNITY_ENABLED = 'true'; });

describe('rules', () => {
  it('only an adult staff member posts, and juniors never see', () => {
    expect(mayPostShortage(false, true)).toBe(true);
    expect(mayPostShortage(false, false)).toBe(false);
    expect(mayPostShortage(true, true)).toBe(false);
    expect(maySeeShortage(true)).toBe(false);
    expect(maySeeShortage(false)).toBe(true);
  });
  it('limits how far ahead a game can be posted', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    expect(checkShortageWhen(new Date('2026-11-28T12:00:00Z'), now).ok).toBe(true);
    expect(checkShortageWhen(new Date('2026-11-21T12:00:00Z'), now).ok).toBe(false);
    expect(checkShortageWhen(new Date('2027-01-30T12:00:00Z'), now).ok).toBe(false);
  });
});

describe('listing', () => {
  it('shows an adult the open games, with their own reply marked', async () => {
    world();
    const r = await listShortages('me', 'all');
    expect(r.success && r.data.shortages).toEqual([expect.objectContaining({ id: 's1', club: 'Eton CC', need: 2, replied: true, canReply: false, mine: false })]);
  });
  it('shows a junior nothing at all', async () => {
    world({ junior: true });
    const r = await listShortages('me', 'all');
    expect(r.success && r.data.shortages).toEqual([]);
  });
});

describe('posting', () => {
  const input = (o: Record<string, unknown> = {}) => ({ clubId: 'c1', playAt: soon(), format: 'league', need: 2, place: 'Our ground', note: 'Bring whites', ...o });
  it('works for staff and runs the safety check', async () => {
    world(); db.community_shortages = () => [{ id: 'new1' }];
    const r = await postShortage('me', input());
    expect(r.success).toBe(true);
    expect(mockCheck).toHaveBeenCalled();
    expect(writes.find((w) => w.table === 'community_shortages' && w.op === 'insert')).toBeTruthy();
  });
  it('is refused for a non-staff member, a junior, and bad input, writing nothing', async () => {
    world({ staff: false }); expect((await postShortage('me', input())).success).toBe(false);
    world({ junior: true }); expect((await postShortage('me', input())).success).toBe(false);
    world(); expect((await postShortage('me', input({ need: 9 }))).success).toBe(false);
    expect((await postShortage('me', input({ format: 'cup' }))).success).toBe(false);
    expect((await postShortage('me', input({ playAt: '2020-01-01T10:00:00Z' }))).success).toBe(false);
    expect(writes.filter((w) => w.op === 'insert')).toHaveLength(0);
  });
  it('stores nothing when the safety check stops it', async () => {
    world(); mockCheck.mockResolvedValueOnce({ status: 'held' as never, tell: 'No contact details', held: false } as never);
    expect((await postShortage('me', input({ note: 'ring 07700 900123' }))).success).toBe(false);
    expect(writes.filter((w) => w.op === 'insert')).toHaveLength(0);
  });
});

describe('replying', () => {
  it('tells the poster, and only the poster', async () => {
    world({ shortage: { id: 's1', club_id: 'c2', posted_by: 'p', play_at: soon(), status: 'open' } });
    const r = await replyToShortage('me', 's1', true);
    expect(r.success).toBe(true);
    expect(writes.find((w) => w.table === 'community_shortage_replies')?.op).toBe('upsert');
    expect(writes.filter((w) => w.table === 'community_notifications').map((w) => (w.args[0] as { user_id: string; kind: string }))).toEqual([expect.objectContaining({ user_id: 'p', kind: 'shortage_reply' })]);
  });
  it('is refused for a junior, for your own post and for a closed game', async () => {
    world({ junior: true, shortage: { id: 's1', club_id: 'c2', posted_by: 'p', play_at: soon(), status: 'open' } });
    expect((await replyToShortage('me', 's1', true)).success).toBe(false);
    world({ shortage: { id: 's1', club_id: 'c2', posted_by: 'me', play_at: soon(), status: 'open' } });
    expect((await replyToShortage('me', 's1', true)).success).toBe(false);
    world({ shortage: { id: 's1', club_id: 'c2', posted_by: 'p', play_at: soon(), status: 'filled' } });
    expect((await replyToShortage('me', 's1', true)).success).toBe(false);
    expect(writes.filter((w) => w.table === 'community_shortage_replies')).toHaveLength(0);
  });
});

describe('who sees the replies', () => {
  it('only the poster', async () => {
    world({ shortage: { posted_by: 'p' } });
    expect((await getReplies('me', 's1')).success).toBe(false);
    expect((await getReplies('p', 's1')).success).toBe(true);
  });
  it('only the poster can close it', async () => {
    world(); db.community_shortages = (ops) => (ops.some((o) => o[0] === 'eq' && o[1] === 'posted_by' && o[2] === 'p') ? [{ id: 's1' }] : []);
    expect((await closeShortage('me', 's1', 'filled')).success).toBe(false);
    expect((await closeShortage('p', 's1', 'filled')).success).toBe(true);
  });
});
