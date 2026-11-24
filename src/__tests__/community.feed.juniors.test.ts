// These tests are about how under-18s behave when the Community is open to them
process.env.COMMUNITY_JUNIORS_ENABLED = 'true';
// A junior's posts and comments reach only people who may open that junior's profile.

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const db: Record<string, Row[]> = {};

const topLevelSplit = (s: string) => { const out: string[] = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };
const evalCond = (c: string, r: Row): boolean => {
  const and = c.match(/^and\((.*)\)$/); if (and) return topLevelSplit(and[1]).every((x) => evalCond(x, r));
  const inn = c.match(/^(\w+)\.in\.\((.*)\)$/); if (inn) return inn[2].split(',').includes(String(r[inn[1]]));
  const eq = c.match(/^(\w+)\.eq\.(.*)$/); return !!eq && String(r[eq[1]]) === eq[2];
};

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const filters: Array<(r: Row) => boolean> = []; let op = 'select'; let payload: Row | null = null; let one = false;
      const chain: Record<string, unknown> = {};
      const rows = () => {
        if (table === 'child_profiles') { // the linked-parent lookup
          const parent = filters.find((f) => (f as { key?: string }).key === 'parent_child_links.parent_id');
          return db.child_profiles.filter((c) => filters.every((f) => (f as { key?: string }).key === 'parent_child_links.parent_id' || f(c))).filter((c) => !parent || parent(c));
        }
        return (db[table] ?? []).filter((r) => filters.every((f) => f(r)));
      };
      const f = (key: string, fn: (r: Row) => boolean) => { const g = Object.assign((r: Row) => fn(r), { key }); filters.push(g); };
      chain.select = () => chain; chain.not = () => chain;
      chain.insert = (p: Row) => { op = 'insert'; payload = p; return chain; };
      chain.delete = () => { op = 'delete'; return chain; };
      chain.eq = (k: string, v: unknown) => { if (k === 'parent_child_links.parent_id') f(k, (r) => r.parent_ids.includes(v)); else f(k, (r) => r[k] === v); return chain; };
      chain.in = (k: string, v: unknown[]) => { f(k, (r) => v.includes(r[k])); return chain; };
      chain.or = (expr: string) => { f('or', (r) => topLevelSplit(expr).some((x) => evalCond(x, r))); return chain; };
      chain.order = () => chain; chain.limit = () => chain;
      chain.maybeSingle = () => { one = true; return chain; };
      chain.then = (resolve: (v: unknown) => unknown) => {
        if (op === 'insert') { (db[table] ??= []).push(payload!); return Promise.resolve({ data: null, error: null }).then(resolve); }
        if (op === 'delete') { db[table] = (db[table] ?? []).filter((r) => !filters.every((g) => g(r))); return Promise.resolve({ data: null, error: null }).then(resolve); }
        const data = rows();
        return Promise.resolve({ data: one ? (data[0] ?? null) : data, error: null, count: data.length }).then(resolve);
      };
      return chain;
    },
  }),
}));
jest.mock('@/lib/community/moderation', () => ({ checkContent: async () => ({ status: 'live', tell: null, held: false }) }));
jest.mock('@/lib/scores/context', () => ({ awardScores: jest.fn() }));

import { addComment, getComments, getFeed, toggleLike } from '@/lib/community/service';
import type { Scope } from '@/lib/community/rules';

const SCOPES: Scope[] = ['club', 'miles', 'league', 'county', 'all'];
const club = (id: string, name: string) => ({ id, name, county: 'Somerset', league: 'Valley', ground_lat: 51.38, ground_lng: -2.36 });
const member = (user_id: string, club_id: string, role: string, is_junior = false) => ({ user_id, club_id, role, is_junior, is_active: true, joined_at: '2026-01-01' });

beforeEach(() => {
  db.clubs = [club('c1', 'Demo CC'), club('c2', 'Other CC')];
  db.profiles = ['kid', 'kid2', 'mum', 'coach', 'teammate', 'stranger'].map((id) => ({ id, full_name: `${id} Surname`, display_name: id, date_of_birth: '1990-01-01' }));
  db.club_members = [
    member('kid', 'c1', 'player', true), member('kid2', 'c1', 'player', true), member('mum', 'c1', 'parent'), member('coach', 'c1', 'coach'),
    member('teammate', 'c1', 'player'), member('stranger', 'c2', 'player'),
  ];
  db.child_profiles = [{ id: 'ch1', linked_user_id: 'kid', parent_ids: ['mum'], parent_child_links: [{ parent_id: 'mum', verified_at: 'x' }] }, { id: 'ch2', linked_user_id: 'kid2', parent_ids: ['dad'], parent_child_links: [{ parent_id: 'dad', verified_at: 'x' }] }];
  db.community_blocks = []; db.community_post_likes = []; db.community_comments = [
    { id: 'cm-kid', post_id: 'adult-post', author_id: 'kid', body: 'Well played', status: 'live', created_at: '2026-01-02' },
    { id: 'cm-adult', post_id: 'adult-post', author_id: 'teammate', body: 'Cheers', status: 'live', created_at: '2026-01-03' },
    { id: 'cm-on-kid', post_id: 'kid-post', author_id: 'kid2', body: 'Nice one', status: 'live', created_at: '2026-01-04' },
  ];
  db.community_posts = [
    { id: 'kid-post', author_id: 'kid', club_id: 'c1', body: 'Junior post', status: 'live', created_at: '2026-01-02' },
    { id: 'adult-post', author_id: 'teammate', club_id: 'c1', body: 'Adult post', status: 'live', created_at: '2026-01-01' },
  ];
});

const ids = async (viewer: string, scope: Scope) => { const r = await getFeed(viewer, scope); return r.success ? r.data.posts.map((p) => p.id) : []; };
const CAN = ['kid', 'kid2', 'mum', 'coach'];
const CANNOT = ['stranger', 'teammate'];

describe('a junior’s post in getFeed', () => {
  it.each(SCOPES)('is hidden from an adult at another club and from a same-club adult who is not staff (%s)', async (scope) => {
    for (const viewer of CANNOT) expect(await ids(viewer, scope)).not.toContain('kid-post');
  });
  it.each(SCOPES)('is shown to the junior, another junior, the linked parent and a shared-club coach (%s)', async (scope) => {
    for (const viewer of CAN) expect(await ids(viewer, scope)).toContain('kid-post');
  });
  it('does not hide adults’ posts from anyone', async () => {
    for (const viewer of [...CAN, ...CANNOT]) expect(await ids(viewer, 'all')).toContain('adult-post');
  });
});

describe('a junior’s post by like and comment', () => {
  it('answers “Post not found.” to those who may not see it', async () => {
    for (const viewer of CANNOT) {
      expect(await toggleLike(viewer, 'kid-post')).toEqual({ success: false, error: 'Post not found.' });
      expect(await addComment(viewer, 'kid-post', 'Hello')).toEqual({ success: false, error: 'Post not found.' });
      expect(await getComments(viewer, 'kid-post')).toEqual({ success: false, error: 'Post not found.' });
    }
    expect(db.community_post_likes).toHaveLength(0);
    expect(db.community_comments.some((c) => c.body === 'Hello')).toBe(false);
  });
  it('works for those who may', async () => {
    for (const viewer of CAN) {
      expect((await toggleLike(viewer, 'kid-post')).success).toBe(true);
      expect((await toggleLike(viewer, 'kid-post')).success).toBe(true); // and back off again
      expect((await addComment(viewer, 'kid-post', 'Hello')).success).toBe(true);
      expect((await getComments(viewer, 'kid-post')).success).toBe(true);
    }
    // Another junior's comment shows to juniors and the coach, but not to a parent linked only to a different child
    const idsFor = async (v: string) => { const c = await getComments(v, 'kid-post'); return c.success ? c.data.map((x) => x.id) : []; };
    for (const viewer of ['kid', 'kid2', 'coach']) expect(await idsFor(viewer)).toContain('cm-on-kid');
    expect(await idsFor('mum')).not.toContain('cm-on-kid');
  });
});

describe('a junior’s comment on an adult’s post', () => {
  const seen = async (viewer: string) => { const r = await getComments(viewer, 'adult-post'); return r.success ? r.data.map((c) => c.id) : []; };
  it('is dropped for people who may not open that junior’s profile', async () => {
    for (const viewer of CANNOT) expect(await seen(viewer)).toEqual(['cm-adult']);
  });
  it('is kept for those who may', async () => {
    for (const viewer of CAN) expect(await seen(viewer)).toEqual(['cm-kid', 'cm-adult']);
  });
});
