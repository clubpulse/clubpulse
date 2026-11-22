import * as fs from 'fs';
import * as path from 'path';

const awardScores = jest.fn(async () => ({ ok: true, amount: 3 }));
const checkContent = jest.fn();
const inserted: Array<[string, unknown]> = [];

jest.mock('@/lib/scores/context', () => ({ awardScores: (...a: unknown[]) => awardScores(...(a as [])), getPrimaryClubId: async () => 'club-1', weekStartIso: () => '2026-11-16T00:00:00.000Z' }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: (...a: unknown[]) => checkContent(...a) }));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      q.select = () => q; q.eq = () => q; q.in = () => q; q.not = () => q; q.order = () => q; q.limit = () => q;
      q.maybeSingle = async () => ({ data: table === 'clubs' ? { id: 'club-1', name: 'Demo', county: null, league: null, ground_lat: null, ground_lng: null } : null });
      q.insert = async (row: unknown) => { inserted.push([table, row]); return { error: null }; };
      q.then = (res: (v: unknown) => unknown) => res({ data: table === 'club_members' ? [{ club_id: 'club-1', is_junior: false, is_active: true, joined_at: '2026-01-01' }] : table === 'profiles' ? [{ id: 'u', date_of_birth: '1990-01-01' }] : [], error: null });
      return q;
    },
  }),
}));

import { createPost } from '@/lib/community/service';

beforeEach(() => { awardScores.mockClear(); checkContent.mockReset(); inserted.length = 0; });

describe('Scores for Community posts', () => {
  it('pays for a post that goes live, once a day by reference', async () => {
    checkContent.mockResolvedValue({ status: 'live' });
    const r = await createPost('u', 'Great net session tonight');
    expect(r).toMatchObject({ success: true, data: { status: 'live' } });
    expect(awardScores).toHaveBeenCalledTimes(1);
    expect(awardScores).toHaveBeenCalledWith('u', 'club-1', 'community_post', expect.stringMatching(/^day:\d{4}-\d{2}-\d{2}$/));
  });

  it('pays nothing for a post held by the safety check', async () => {
    checkContent.mockResolvedValue({ status: 'held', tell: 'Held', held: true });
    const r = await createPost('u', 'Something the AI was unsure about');
    expect(r).toMatchObject({ success: true, data: { status: 'held' } });
    expect(inserted.some(([t, row]) => t === 'community_posts' && (row as { status: string }).status === 'held')).toBe(true);
    expect(awardScores).not.toHaveBeenCalled();
  });

  it('pays nothing for a post stopped by the written rules (never stored)', async () => {
    checkContent.mockResolvedValue({ status: 'held', tell: 'No', held: false });
    await createPost('u', 'rule-breaking text');
    expect(inserted).toHaveLength(0);
    expect(awardScores).not.toHaveBeenCalled();
  });
});

describe('pillar Scores rules migration', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261122000007_pillar_scores_rules.sql'), 'utf8');
  it('adds the three new sources and not the Academy ones', () => {
    for (const s of ['community_post', 'community_session', 'wellness_readiness']) expect(sql).toContain(`'${s}'`);
    expect(sql).not.toContain("'academy_lesson'");
    expect(sql).toContain('ON CONFLICT (source) DO UPDATE');
  });
});
