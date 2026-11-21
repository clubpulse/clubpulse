const from = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from }) }));

import { resolveItem } from '@/lib/community/review';

beforeEach(() => from.mockReset());

describe('resolveItem', () => {
  it('rejects unknown actions and kinds without touching the database', async () => {
    expect((await resolveItem('s', { action: 'ban', kind: 'post', targetId: 'x' })).success).toBe(false);
    expect((await resolveItem('s', { action: 'allow', kind: 'dm', targetId: 'x' })).success).toBe(false);
    expect((await resolveItem('s', { action: 'allow', kind: 'post', targetId: 5 })).success).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('removing a post marks it removed, closes its reports and logs the decision', async () => {
    const calls: Array<[string, string, unknown]> = [];
    const chain = (table: string, op: string) => {
      const c: Record<string, unknown> = {};
      c.update = (v: unknown) => { calls.push([table, 'update', v]); return c; };
      c.insert = (v: unknown) => { calls.push([table, 'insert', v]); return Promise.resolve({ error: null }); };
      c.eq = () => c;
      c.then = (res: (v: unknown) => unknown) => res({ error: null });
      void op;
      return c;
    };
    from.mockImplementation((t: string) => chain(t, ''));
    const r = await resolveItem('staff1', { action: 'remove', kind: 'post', targetId: 'p1', reportId: 'r1' });
    expect(r.success).toBe(true);
    expect(calls).toContainEqual(['community_posts', 'update', { status: 'removed' }]);
    expect(calls).toContainEqual(['community_reports', 'update', { handled: true }]);
    expect(calls).toContainEqual(['community_moderation_events', 'insert', { staff_id: 'staff1', action: 'remove', kind: 'post', target_id: 'p1', report_id: 'r1' }]);
  });

  it('marking handled leaves the content alone', async () => {
    const tables: string[] = [];
    from.mockImplementation((t: string) => {
      tables.push(t);
      const c: Record<string, unknown> = {};
      c.update = () => c; c.insert = () => Promise.resolve({ error: null }); c.eq = () => c;
      c.then = (res: (v: unknown) => unknown) => res({ error: null });
      return c;
    });
    await resolveItem('s', { action: 'handled', kind: 'post', targetId: 'p1' });
    expect(tables).not.toContain('community_posts');
  });
});
