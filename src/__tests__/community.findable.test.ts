const from = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from }) }));

import { getReviewQueue } from '@/lib/community/review';
import { NAV_GROUPS, NETWORK_LINKS, buildAudience, menuFor } from '@/lib/nav/menu';
import { PILLARS, pillarSections, whenOpen } from '@/lib/nav/pillars';

const aud = (userRoles: string[], extra: Partial<{ junior: boolean; admin: boolean }> = {}) =>
  buildAudience({ userRoles, memberRoles: [], junior: false, admin: false, ...extra });
const hrefs = (a: ReturnType<typeof aud>, community?: boolean) => menuFor(a, { community }).flatMap((g) => g.links.map((l) => l.href));

describe('Community links across clubs', () => {
  it('are hidden while the Community is closed, so nobody lands on a closed page', () => {
    for (const l of NETWORK_LINKS) expect(hrefs(aud(['player']))).not.toContain(l.href);
    expect(hrefs(aud(['player']), false)).toEqual(hrefs(aud(['player'])));
  });

  it('appear at the top of the Community group once it is open', () => {
    const community = menuFor(aud(['player']), { community: true }).find((g) => g.key === 'community')!;
    const mine = NETWORK_LINKS.filter((l) => !l.for || l.for.includes('player')).map((l) => l.href);
    expect(community.links.slice(0, mine.length).map((l) => l.href)).toEqual(mine);
    expect(mine).not.toContain('/parent/community');
  });

  it('give a parent their notifications and the page about their child, and nothing else across clubs', () => {
    const parent = hrefs(aud(['parent']), true).filter((h) => NETWORK_LINKS.some((l) => l.href === h));
    expect(parent).toEqual(['/community/notifications', '/parent/community']);
  });

  it('are not duplicates of anything already in the menu', () => {
    const existing = NAV_GROUPS.flatMap((g) => g.links.map((l) => l.href));
    for (const l of NETWORK_LINKS) expect(existing).not.toContain(l.href);
  });

  it('are not shown to someone with no player-side role', () => {
    expect(hrefs(aud([], { admin: true }), true)).not.toContain('/community/feed');
  });

  it('reach the Community page sections and drop the "on the way" line', () => {
    const sections = pillarSections('community', aud(['player']), { community: true });
    expect(sections.flatMap((s) => s.links.map((l) => l.href))).toContain('/community/connections');
    const pillar = PILLARS.find((p) => p.key === 'community')!;
    expect(whenOpen(pillar, true).soon.some((s) => s.startsWith('The wider network'))).toBe(false);
    expect(whenOpen(pillar, false)).toBe(pillar);
  });
});

describe('staff review queue', () => {
  it('includes messages the safety check held', async () => {
    const rows: Record<string, unknown[]> = {
      community_reports: [], community_posts: [], community_comments: [],
      community_messages: [{ id: 'm1', sender_id: 'u1', body: 'hold me', held_reason: 'Asked for a phone number', created_at: '2026-11-22T10:00:00Z' }],
      profiles: [{ id: 'u1', full_name: 'Sam Jones' }],
    };
    from.mockImplementation((t: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'order', 'limit', 'or', 'not', 'maybeSingle']) c[m] = () => c;
      c.then = (res: (v: unknown) => unknown) => res({ data: rows[t] ?? [], error: null });
      return c;
    });
    const q = await getReviewQueue();
    const m = q.find((i) => i.kind === 'message');
    expect(m).toMatchObject({ targetId: 'm1', status: 'held', reason: 'Asked for a phone number', reportId: null });
  });
});
