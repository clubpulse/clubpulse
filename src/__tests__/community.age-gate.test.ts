// These tests are about how under-18s behave when the Community is open to them
process.env.COMMUNITY_JUNIORS_ENABLED = 'true';
// The age rule is applied by the service itself, not only by the screens: a shut-out person can do nothing.

type Rows = Record<string, unknown[]>;
let tables: Rows = {};
const makeChain = (table: string) => {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'or', 'not', 'is', 'gt', 'order', 'limit', 'maybeSingle']) c[m] = () => c;
  for (const op of ['insert', 'update', 'upsert']) c[op] = () => { written.push(table); return c; };
  c.then = (res: (v: unknown) => unknown) => res({ data: tables[table] ?? [], error: null });
  return c;
};
const written: string[] = [];
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => makeChain(t) }) }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: async () => ({ status: 'live', tell: null, held: false }) }));
jest.mock('@/lib/scores/context', () => ({ awardScores: jest.fn(async () => ({ ok: true })) }));

import { createPost, getFeed, getNearby, answerPerson, sendMessage } from '@/lib/community/service';
import { createSession } from '@/lib/community/sessions';
import { HOLD_NEEDS_DOB, HOLD_PENDING_PARENT } from '@/lib/community/age';

const world = (o: { dob: string | null; junior: boolean; parent: boolean }) => {
  written.length = 0;
  tables = {
    profiles: [{ id: 'me', full_name: 'Me', display_name: null, date_of_birth: o.dob }],
    club_members: [{ user_id: 'me', club_id: 'c1', role: 'member', is_junior: o.junior, is_active: true, joined_at: '2026-01-01' }],
    clubs: [{ id: 'c1', name: 'Slough CC', county: null, league: null, ground_lat: null, ground_lng: null }],
    child_profiles: o.parent ? [{ linked_user_id: 'me', parent_child_links: [{ parent_id: 'mum', verified_at: 'x' }] }] : [],
    community_blocks: [],
  };
};

describe('an adult with no date of birth', () => {
  beforeEach(() => world({ dob: null, junior: false, parent: false }));
  it('cannot post, see the feed, find people, connect, message or host', async () => {
    expect(await createPost('me', 'Hello')).toEqual({ success: false, error: HOLD_NEEDS_DOB });
    expect(await getFeed('me', 'all')).toEqual({ success: false, error: HOLD_NEEDS_DOB });
    expect(await getNearby('me', 'all', null)).toEqual({ success: false, error: HOLD_NEEDS_DOB });
    expect(await answerPerson('me', 'x', true)).toEqual({ success: false, error: HOLD_NEEDS_DOB });
    expect((await createSession('me', { clubId: 'c1' } as never)).success).toBe(false);
    expect((await sendMessage('me', 'conn', 'hi')).success).toBe(false);
    expect(written).toEqual([]);
  });
});

describe('a child with no verified parent', () => {
  it('is shut out whether an admin marked them or only their date of birth says so', async () => {
    for (const o of [{ dob: '2012-01-01', junior: false }, { dob: '2012-01-01', junior: true }, { dob: null, junior: true }]) {
      world({ ...o, parent: false });
      expect(await createPost('me', 'Hello')).toEqual({ success: false, error: HOLD_PENDING_PARENT });
      expect(written).toEqual([]);
    }
  });
});

describe('a child with a verified parent, and an adult with a date of birth', () => {
  it('can use the Community', async () => {
    world({ dob: '2012-01-01', junior: false, parent: true });
    expect((await createPost('me', 'Hello')).success).toBe(true);
    world({ dob: '1990-01-01', junior: false, parent: false });
    expect((await createPost('me', 'Hello')).success).toBe(true);
  });
});
