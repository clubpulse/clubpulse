type Call = { table: string; op: string; args: unknown[] };
const calls: Call[] = [];
let tables: Record<string, (chain: string[]) => unknown[]> = {};

const makeChain = (table: string) => {
  const chain: string[] = [];
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'or', 'not', 'is', 'order', 'limit', 'maybeSingle']) c[m] = (...a: unknown[]) => { chain.push(`${m}`); if (m === 'in' || m === 'eq') chain.push(`${m}:${String(a[0])}:${String(a[1])}`); return c; };
  for (const op of ['insert', 'update', 'upsert']) c[op] = (...a: unknown[]) => { calls.push({ table, op, args: a }); return c; };
  c.then = (res: (v: unknown) => unknown) => res({ data: (tables[table] ?? (() => []))(chain), error: null });
  return c;
};
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => makeChain(t) }) }));
const fetchMock = jest.fn();
(global as unknown as { fetch: unknown }).fetch = fetchMock;

import { answerPerson, getNearby } from '@/lib/community/service';
import { matchesFilters } from '@/lib/community/rules';
import { filtersFrom } from '@/lib/community/filters';
import { sendPush } from '@/lib/community/notify';

const member = (user_id: string, junior: boolean, role = 'member') => ({ user_id, club_id: 'c1', role, is_junior: junior, is_active: true });
const setup = (o: { juniors: boolean; pending?: boolean; parents?: Record<string, string[]> }) => {
  calls.length = 0;
  tables = {
    profiles: () => [{ id: 'a', full_name: 'Amy Ng', display_name: null, push_token: 'ExponentPushToken[abc]' }, { id: 'b', full_name: 'Ben Ode', display_name: null, push_token: null }],
    club_members: () => [member('a', o.juniors), member('b', o.juniors)],
    clubs: () => [{ id: 'c1', name: 'Slough CC', county: 'Berks', league: 'L', ground_lat: null, ground_lng: null }],
    community_blocks: () => [],
    community_connections: () => (o.pending ? [{ id: 'x1', requester_id: 'b', addressee_id: 'a', status: 'pending' }] : []),
    // parentsOf asks for one junior's linked child record, by linked_user_id
    child_profiles: (chain) => {
      const who = (chain.join(' ').match(/eq:linked_user_id:(\w+)/) ?? [])[1] ?? 'a';
      const parents = o.parents?.[who] ?? [];
      return parents.length ? [{ parent_child_links: parents.map((p) => ({ parent_id: p, verified_at: 'now' })) }] : [];
    },
  };
};
const events = () => calls.filter((c) => c.table === 'community_connection_events').map((c) => (c.args[0] as { event: string }).event);
const notices = () => calls.filter((c) => c.table === 'community_notifications').map((c) => c.args[0] as { user_id: string; kind: string });

beforeEach(() => { fetchMock.mockReset(); fetchMock.mockResolvedValue({ ok: true }); });

describe('rules', () => {
  it('matches filters, and a card with nothing filled in does not match that filter', () => {
    const card = { roles: ['player'], standard: 'club' as const, availability: ['weekends' as const], miles: 4 };
    expect(matchesFilters(card, {})).toBe(true);
    expect(matchesFilters(card, { role: 'coach' })).toBe(false);
    expect(matchesFilters(card, { standard: 'league' })).toBe(false);
    expect(matchesFilters(card, { availability: 'weekday_evenings' })).toBe(false);
    expect(matchesFilters(card, { within: 5 })).toBe(true);
    expect(matchesFilters({ ...card, miles: 8 }, { within: 5 })).toBe(false);
    expect(matchesFilters({ ...card, miles: null }, { within: 25 })).toBe(false);
    expect(matchesFilters({ ...card, standard: null }, { standard: 'club' })).toBe(false);
  });
  it('ignores filters it does not recognise', () => {
    const q: Record<string, string> = { role: 'admin', standard: 'pro', availability: 'always', within: '999' };
    expect(filtersFrom((k) => q[k])).toEqual({});
    expect(filtersFrom((k) => ({ role: 'coach', within: '10' } as Record<string, string>)[k])).toEqual({ role: 'coach', within: 10 });
  });
});

describe('answerPerson between two juniors', () => {
  it('lets two juniors connect even when neither has a linked parent', async () => {
    setup({ juniors: true });
    const r = await answerPerson('a', 'b', true);
    expect(r.success && r.data.link).toBe('requested');
    expect(calls.filter((c) => c.table === 'community_connections').length).toBeGreaterThan(0);
  });

  it('sends a request, logs it and tells the other person', async () => {
    setup({ juniors: true });
    const r = await answerPerson('a', 'b', true);
    expect(r.success && r.data.link).toBe('requested');
    expect(events()).toEqual(['requested']);
    expect(notices()).toEqual([expect.objectContaining({ user_id: 'b', kind: 'connect_request' })]);
  });

  it('on accept, logs it, tells the requester and tells each junior\'s parents', async () => {
    setup({ juniors: true, pending: true, parents: { a: ['pa'] } });
    const r = await answerPerson('a', 'b', true);
    expect(r.success && r.data.link).toBe('connected');
    expect(events()).toContain('accepted');
    expect(events()).toContain('parent_notified');
    expect(notices().map((n) => n.kind)).toEqual(expect.arrayContaining(['connect_accepted', 'parent_connection']));
    expect(notices().filter((n) => n.kind === 'parent_connection').every((n) => n.user_id === 'pa')).toBe(true);
  });

  it('on accept, tells every parent it can, and records who had nobody to tell', async () => {
    setup({ juniors: true, pending: true, parents: { a: ['pa'] } });
    await answerPerson('a', 'b', true);
    // a has a parent (told); b has none, which is logged rather than blocking the connection
    expect(events().filter((e) => e === 'parent_notified')).toHaveLength(1);
    expect(events()).toContain('no_parent_to_notify');
  });

  it('with parents on both sides, each set is told', async () => {
    setup({ juniors: true, pending: true, parents: { a: ['pa'], b: ['pb'] } });
    await answerPerson('a', 'b', true);
    expect(notices().filter((n) => n.kind === 'parent_connection').map((n) => n.user_id).sort()).toEqual(['pa', 'pb']);
    expect(events()).not.toContain('no_parent_to_notify');
  });

  it('a failed push never fails the connection', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    setup({ juniors: true });
    const r = await answerPerson('a', 'b', true);
    expect(r.success).toBe(true);
  });
});

describe('answerPerson between two adults', () => {
  it('needs no parent link and notifies no parents', async () => {
    setup({ juniors: false, pending: true });
    const r = await answerPerson('a', 'b', true);
    expect(r.success && r.data.link).toBe('connected');
    expect(notices().some((n) => n.kind === 'parent_connection')).toBe(false);
  });
  it('"not now" is logged as a pass', async () => {
    setup({ juniors: false });
    await answerPerson('a', 'b', false);
    expect(events()).toEqual(['passed']);
  });
});

describe('getNearby for a junior', () => {
  it('shows other juniors without needing a linked parent, and no notice', async () => {
    setup({ juniors: true });
    const r = await getNearby('a', 'club', null);
    expect(r.success && r.data.notice).toBeNull();
    expect(r.success && r.data.people.map((p) => p.id)).toContain('b');
  });
});

describe('sendPush', () => {
  it('only sends to a real Expo token', async () => {
    expect(await sendPush('nonsense', { title: 't' })).toBe(false);
    expect(await sendPush(null, { title: 't' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await sendPush('ExponentPushToken[abc]', { title: 't', body: 'b' })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('resolves false when the push service is down', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    expect(await sendPush('ExponentPushToken[abc]', { title: 't' })).toBe(false);
  });
});
