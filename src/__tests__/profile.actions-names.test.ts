// The refactored actions take names from the lookup helper, not from an embed on the signed-in client.
const lookups: Array<{ fn: string; args: unknown[] }> = [];
jest.mock('@/lib/profile/lookup', () => ({
  cardName: (c: { display_name?: string; full_name?: string } | undefined, fb = 'Unknown') => c?.display_name || c?.full_name || fb,
  clubNameCards: async (...args: unknown[]) => { lookups.push({ fn: 'clubNameCards', args }); return new Map([['u1', { id: 'u1', full_name: 'Una One', display_name: 'Una', avatar_url: null }]]); },
  sharedClubNameCards: async (...args: unknown[]) => { lookups.push({ fn: 'sharedClubNameCards', args }); return new Map([['u1', { id: 'u1', full_name: 'Una One', display_name: 'Una', avatar_url: null }]]); },
}));
const rows: Record<string, unknown[]> = {};
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (table: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'gte', 'lte']) c[m] = () => c;
      c.maybeSingle = async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null });
      c.then = (res: (v: unknown) => unknown) => res({ data: rows[table] ?? [], error: null });
      return c;
    },
  }),
}));
jest.mock('@/lib/auth/server', () => ({ getCurrentUser: async () => ({ id: 'me' }), requireUser: async () => ({ id: 'me' }) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { getClubFormGuide } from '@/lib/actions/form';
import { adminGetAcknowledgementStatus } from '@/lib/actions/documents';
import { getMyVictims } from '@/lib/actions/rivalry';

beforeEach(() => { lookups.length = 0; for (const k of Object.keys(rows)) delete rows[k]; });

describe('names come from the lookup helper', () => {
  it('form guide: names the player and asks for the club\'s members only', async () => {
    rows.form_ratings = [{ user_id: 'u1', club_id: 'c1', rating: 80, trend: 'up', last_5_scores: [], last_5_wickets: [], matches_played: 5, updated_at: 'now' }];
    const r = await getClubFormGuide('c1');
    expect(r.success && r.data[0].display_name).toBe('Una');
    expect(lookups).toEqual([{ fn: 'clubNameCards', args: ['c1', ['u1']] }]);
  });
  it('form guide: a player the caller may not see is "Unknown", not an error', async () => {
    rows.form_ratings = [{ user_id: 'u9', club_id: 'c1', rating: 70, trend: 'flat', last_5_scores: [], last_5_wickets: [], matches_played: 1, updated_at: 'now' }];
    const r = await getClubFormGuide('c1');
    expect(r.success && r.data[0].display_name).toBe('Unknown');
  });
  it('document acknowledgements: unacknowledged members are named from the club lookup', async () => {
    rows.club_members = [{ user_id: 'u1' }];
    rows.document_acknowledgements = [];
    const r = await adminGetAcknowledgementStatus('d1', 'c1');
    expect(r.success && r.data.unacked_members).toEqual([{ user_id: 'u1', display_name: 'Una' }]);
    expect(lookups[0]).toEqual({ fn: 'clubNameCards', args: ['c1', ['u1']] });
  });
  it('rivalry: opponent names use the shared-club lookup', async () => {
    rows.nemesis_pairs = [{ batter_id: 'u1', bowler_id: 'me', dismissals: 3 }];
    const r = await getMyVictims('me');
    expect(r.success && (r.data[0] as unknown as { batter_name: string }).batter_name).toBe('Una');
    expect(lookups[0].fn).toBe('sharedClubNameCards');
  });
});
