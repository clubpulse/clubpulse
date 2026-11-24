// Members can report a session or a Short-for-Saturday game as itself, and it lands in the staff review queue.
import { memdb, client } from './helpers/memdb';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => client() }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: async () => ({ status: 'live' }) }));

import { report } from '@/lib/community/service';
import { parentReport } from '@/lib/community/social';
import { getReviewQueue, resolveItem } from '@/lib/community/review';

const reports = () => memdb.writes.filter((w) => w.table === 'community_reports' && w.op === 'insert');
beforeEach(() => {
  memdb.reset({
    community_sessions: [{ id: 's1', host_id: 'host', title: 'Under-12 nets', note: null, place: 'Fairwick Ground', status: 'open' }],
    community_shortages: [{ id: 'g1', posted_by: 'poster', note: 'Need two for the fixture', place: 'Fairwick Ground', status: 'open' }],
    community_posts: [], community_comments: [], community_messages: [], community_reports: [],
    parent_child_links: [
      { parent_id: 'mum', child_id: 'k1', verified_at: '2026-01-01', child_profiles: { linked_user_id: 'kid' } },
      { parent_id: 'pending-dad', child_id: 'k1', verified_at: null, child_profiles: { linked_user_id: 'kid' } },
    ],
    profiles: [{ id: 'host', full_name: 'Hannah Host', display_name: null, date_of_birth: '1985-01-01' }, { id: 'poster', full_name: 'Pat Poster', display_name: null, date_of_birth: '1985-01-01' }],
    club_members: [], child_profiles: [],
  });
});

describe('reporting a session or a game', () => {
  it.each([['session', 's1'], ['shortage', 'g1']])('stores a report of a %s against that item, not its host', async (kind, id) => {
    const r = await report('member', { kind, targetId: id, reason: 'Looks wrong' });
    expect(r.success).toBe(true);
    expect(reports()[0].row).toMatchObject({ reporter_id: 'member', kind, target_id: id, reason: 'Looks wrong' });
  });
  it.each([['session', 'nope'], ['shortage', 'nope']])('refuses a %s that does not exist', async (kind, id) => {
    expect((await report('member', { kind, targetId: id })).success).toBe(false);
    expect(reports()).toHaveLength(0);
  });
  it('still refuses a kind it does not know, and still takes the existing four', async () => {
    expect((await report('member', { kind: 'avatar', targetId: 'x' })).success).toBe(false);
    for (const kind of ['post', 'comment', 'message', 'profile']) expect((await report('member', { kind, targetId: 'x' })).success).toBe(true);
  });
  it('lets a verified parent report one on their child’s behalf, and not a parent whose link is unverified', async () => {
    expect((await parentReport('mum', 'k1', { kind: 'session', targetId: 's1', reason: 'x' })).success).toBe(true);
    expect(reports()[0].row).toMatchObject({ kind: 'session', target_id: 's1' });
    expect((await parentReport('pending-dad', 'k1', { kind: 'session', targetId: 's1', reason: 'x' })).success).toBe(false);
    expect(reports()).toHaveLength(1);
  });
});

describe('the review queue', () => {
  it('shows reported sessions and games as session and shortage, with their text and author', async () => {
    await report('member', { kind: 'session', targetId: 's1', reason: 'Why is this at a house' });
    await report('member', { kind: 'shortage', targetId: 'g1', reason: 'Odd' });
    // The fake stores nothing on insert, so mirror what the database would now hold
    memdb.tables.community_reports = reports().map((w, i) => ({ id: `r${i}`, ...(w.row as object), created_at: `2026-11-22T10:0${i}:00Z`, handled: false }));
    const q = await getReviewQueue();
    expect(q.map((i) => i.kind).sort()).toEqual(['session', 'shortage']);
    expect(q.find((i) => i.kind === 'session')).toMatchObject({ targetId: 's1', text: expect.stringContaining('Under-12 nets'), authorName: 'Hannah Host', reason: 'Why is this at a house', status: 'open' });
    expect(q.find((i) => i.kind === 'shortage')).toMatchObject({ targetId: 'g1', authorName: 'Pat Poster' });
  });
  it('lets staff remove or close a reported session', async () => {
    const r = await resolveItem('staff1', { action: 'remove', kind: 'session', targetId: 's1', reportId: 'r0' });
    expect(r.success).toBe(true);
    expect(memdb.writes).toContainEqual({ table: 'community_sessions', op: 'update', row: { status: 'removed' } });
    expect(memdb.writes).toContainEqual({ table: 'community_reports', op: 'update', row: { handled: true } });
  });
});
