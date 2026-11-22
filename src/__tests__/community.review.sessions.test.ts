const calls: Array<[string, string, unknown]> = [];
const eqs: Array<[string, string, unknown]> = [];
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const c: Record<string, unknown> = {};
      c.update = (v: unknown) => { calls.push([table, 'update', v]); return c; };
      c.insert = (v: unknown) => { calls.push([table, 'insert', v]); return Promise.resolve({ error: null }); };
      c.eq = (col: string, val: unknown) => { eqs.push([table, col, val]); return c; };
      c.then = (res: (v: unknown) => unknown) => res({ error: null });
      return c;
    },
  }),
}));
import { resolveItem } from '@/lib/community/review';

beforeEach(() => { calls.length = 0; eqs.length = 0; });

describe('staff review of held sessions and games', () => {
  it('allowing a held session opens it, and only if it is still held', async () => {
    const r = await resolveItem('staff1', { action: 'allow', kind: 'session', targetId: 's1' });
    expect(r.success).toBe(true);
    expect(calls).toContainEqual(['community_sessions', 'update', { status: 'open' }]);
    expect(eqs).toContainEqual(['community_sessions', 'status', 'held']);
    expect(calls).toContainEqual(['community_moderation_events', 'insert', expect.objectContaining({ kind: 'session', action: 'allow', target_id: 's1' })]);
  });
  it('removing a held game takes it down', async () => {
    await resolveItem('staff1', { action: 'remove', kind: 'shortage', targetId: 'g1' });
    expect(calls).toContainEqual(['community_shortages', 'update', { status: 'removed' }]);
  });
  it('posts still go live as before', async () => {
    await resolveItem('staff1', { action: 'allow', kind: 'post', targetId: 'p1' });
    expect(calls).toContainEqual(['community_posts', 'update', { status: 'live' }]);
  });
});
