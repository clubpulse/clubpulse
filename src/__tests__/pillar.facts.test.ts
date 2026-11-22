jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));
jest.mock('@/lib/community/service', () => ({ communityOpen: () => false }));
jest.mock('@/lib/scores/context', () => ({ weekStartIso: () => '2026-11-16T00:00:00.000Z' }));

import { daysAgoLabel, plural } from '@/lib/nav/pillar-facts';

describe('Home pillar facts helpers', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  it('words how long ago, in whole days', () => {
    expect(daysAgoLabel('2026-11-22T08:00:00Z', now)).toBe('today');
    expect(daysAgoLabel('2026-11-21T23:30:00Z', now)).toBe('yesterday');
    expect(daysAgoLabel('2026-11-17T10:00:00Z', now)).toBe('5 days ago');
  });
  it('pluralises', () => {
    expect(plural(1, 'lesson')).toBe('1 lesson');
    expect(plural(3, 'lesson')).toBe('3 lessons');
    expect(plural(2, 'analysis', 'analyses')).toBe('2 analyses');
  });
});
