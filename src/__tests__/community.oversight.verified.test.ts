// A parent sees into their child's Community only once a club has verified the link, like everywhere else a parent counts.
import { memdb, client } from './helpers/memdb';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => client() }));

import { getChildrenOversight, parentBlock, parentCancelRequest } from '@/lib/community/social';

beforeEach(() => memdb.reset({
  parent_child_links: [
    { parent_id: 'mum', child_id: 'k1', verified_at: '2026-01-01', child_profiles: { id: 'k1', first_name: 'Kit', linked_user_id: null } },
    { parent_id: 'pending-dad', child_id: 'k1', verified_at: null, child_profiles: { id: 'k1', first_name: 'Kit', linked_user_id: null } },
  ],
}));

describe('parent oversight needs a verified link', () => {
  it('shows the child to a verified parent', async () => {
    const r = await getChildrenOversight('mum');
    expect(r.success && r.data.map((c) => c.childId)).toEqual(['k1']);
  });
  it('shows nothing to a parent whose link has not been verified', async () => {
    const r = await getChildrenOversight('pending-dad');
    expect(r.success && r.data).toEqual([]);
  });
});

describe('acting for a child with a linked account needs a verified link', () => {
  beforeEach(() => memdb.reset({
    parent_child_links: [
      { parent_id: 'mum', child_id: 'k1', verified_at: '2026-01-01', child_profiles: { linked_user_id: 'kid' } },
      { parent_id: 'pending-dad', child_id: 'k1', verified_at: null, child_profiles: { linked_user_id: 'kid' } },
    ],
    community_connections: [],
  }));
  it('lets a verified parent block someone for the child', async () => {
    expect((await parentBlock('mum', 'k1', 'someone')).success).toBe(true);
    expect(memdb.writes).toContainEqual({ table: 'community_blocks', op: 'upsert', row: { blocker_id: 'kid', blocked_id: 'someone' } });
  });
  it('refuses a parent whose link is unverified, and writes nothing', async () => {
    expect((await parentBlock('pending-dad', 'k1', 'someone')).success).toBe(false);
    expect((await parentCancelRequest('pending-dad', 'k1', 'c1')).success).toBe(false);
    expect(memdb.writes).toHaveLength(0);
  });
});
