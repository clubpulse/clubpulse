import { NAV_GROUPS, audienceLabel, buildAudience, menuFor } from '@/lib/nav/menu';
import { PILLARS, pillarCounts, pillarSections } from '@/lib/nav/pillars';

const hrefs = (a: Parameters<typeof menuFor>[0], o = {}) => menuFor(a, o).flatMap((g) => g.links.map((l) => l.href));
const aud = (userRoles: string[], extra: Partial<{ memberRoles: string[]; junior: boolean; admin: boolean }> = {}) =>
  buildAudience({ userRoles, memberRoles: [], junior: false, admin: false, ...extra });

describe('menu by role', () => {
  it('lists every page once', () => {
    const all = NAV_GROUPS.flatMap((g) => g.links.map((l) => l.href));
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(46);
  });

  it('treats someone with no role as a player', () => {
    expect(aud([]).roles).toEqual(['player']);
    expect(aud(['nonsense']).roles).toEqual(['player']);
  });

  it('counts a club coach or volunteer even if they never chose the role', () => {
    expect(aud(['parent'], { memberRoles: ['coach', 'member'] }).roles).toEqual(['coach', 'parent']);
  });

  it('shows an admin everything, admin tools included', () => {
    const all = NAV_GROUPS.flatMap((g) => g.links.map((l) => l.href));
    expect(hrefs(aud(['parent'], { admin: true }))).toEqual(all);
  });

  it('keeps admin tools from everyone else', () => {
    for (const r of ['player', 'coach', 'parent', 'volunteer']) {
      expect(hrefs(aud([r]))).not.toContain('/admin/club/scout-mode');
      expect(menuFor(aud([r])).map((g) => g.key)).not.toContain('tools');
    }
  });

  it('gives a player the playing pages', () => {
    const h = hrefs(aud(['player']));
    for (const p of ['/availability', '/analyse', '/development', '/log-performance', '/wellbeing', '/scratch-cards', '/finance']) expect(h).toContain(p);
  });

  it('gives a parent the club and rewards, not the player tools', () => {
    const h = hrefs(aud(['parent']));
    for (const p of ['/noticeboard', '/match-day', '/coaching', '/finance', '/fee-offset', '/marketplace', '/companion']) expect(h).toContain(p);
    for (const p of ['/analyse', '/development', '/log-performance', '/availability', '/wellbeing', '/dressing-room']) expect(h).not.toContain(p);
  });

  it('gives a coach the coaching pages but not a player\'s private ones', () => {
    const h = hrefs(aud(['coach']));
    for (const p of ['/availability', '/analyse', '/player-report', '/injury-intel', '/qualifications']) expect(h).toContain(p);
    for (const p of ['/wellbeing', '/pulse-score', '/log-performance', '/finance']) expect(h).not.toContain(p);
  });

  it('gives a volunteer the club pages and qualifications', () => {
    const h = hrefs(aud(['volunteer']));
    expect(h).toContain('/qualifications');
    expect(h).toContain('/noticeboard');
    expect(h).not.toContain('/analyse');
  });

  it('hides adult-only pages from a junior', () => {
    const h = hrefs(aud([], { junior: true }));
    for (const p of ['/scratch-cards', '/raffle', '/finance', '/fee-offset', '/sponsor-a-kid', '/community-pot', '/charity', '/travel', '/transfer-window']) expect(h).not.toContain(p);
    for (const p of ['/games', '/analyse', '/availability', '/marketplace', '/noticeboard']) expect(h).toContain(p);
  });

  it('adds School only when the club runs one', () => {
    expect(hrefs(aud(['player']))).not.toContain('/school');
    expect(hrefs(aud(['player']), { showSchool: true })).toContain('/school');
  });

  it('labels the audience', () => {
    expect(audienceLabel(aud(['player', 'coach']))).toBe('Player · Coach');
    expect(audienceLabel(aud(['parent'], { admin: true }))).toBe('Club admin');
    expect(audienceLabel(aud([], { junior: true }))).toBe('Junior player');
  });

  it('groups the menu by the four pillars, with rewards alongside', () => {
    expect(NAV_GROUPS.map((g) => g.key)).toEqual(['technique', 'community', 'wellness', 'academy', 'scores', 'tools']);
    expect(PILLARS.map((p) => p.key)).toEqual(['technique', 'community', 'wellness', 'academy']);
  });

  it('keeps a group\'s sections together', () => {
    for (const g of NAV_GROUPS) {
      const seen: string[] = [];
      for (const l of g.links) {
        const s = l.section ?? '';
        if (seen[seen.length - 1] !== s) {
          // A section name never comes back once another has started
          expect(seen).not.toContain(s);
          seen.push(s);
        }
      }
    }
  });

  it('shows each person their own pages in a pillar', () => {
    const player = pillarSections('community', aud(['player']));
    expect(player.map((s) => s.title)).toEqual(['Match day', 'My club', 'People', 'Together']);
    const parent = pillarSections('community', aud(['parent'])).flatMap((s) => s.links.map((l) => l.href));
    expect(parent).toContain('/noticeboard');
    expect(parent).not.toContain('/dressing-room');
    // A parent has no wellness pages of their own yet
    expect(pillarSections('wellness', aud(['parent']))).toEqual([]);
    expect(pillarCounts(aud(['parent'])).wellness).toBe(0);
    expect(pillarCounts(aud(['player'])).technique).toBeGreaterThan(5);
  });

  it('puts School in the community pillar', () => {
    const links = pillarSections('community', aud(['player']), { showSchool: true }).find((s) => s.title === 'My club')!.links;
    expect(links.map((l) => l.href)).toContain('/school');
  });
});
