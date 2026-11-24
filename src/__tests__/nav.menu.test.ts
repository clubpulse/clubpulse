import { NAV_GROUPS, asAdmin, asStaff, audienceLabel, buildAudience, menuFor } from '@/lib/nav/menu';
import { PILLARS, pillarCounts, pillarSections } from '@/lib/nav/pillars';
import { bottomLinksFor } from '@/lib/nav/bottom';

const hrefs = (a: Parameters<typeof menuFor>[0], o = {}) => menuFor(a, o).flatMap((g) => g.links.map((l) => l.href));
const aud = (userRoles: string[], extra: Partial<{ memberRoles: string[]; junior: boolean; admin: boolean }> = {}) =>
  buildAudience({ userRoles, memberRoles: [], junior: false, admin: false, ...extra });

describe('menu by role', () => {
  it('lists every page once', () => {
    const all = NAV_GROUPS.flatMap((g) => g.links.map((l) => l.href));
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(62);
  });

  it('treats someone with no role as a player', () => {
    expect(aud([]).roles).toEqual(['player']);
    expect(aud(['nonsense']).roles).toEqual(['player']);
  });

  it('counts a club coach or volunteer even if they never chose the role', () => {
    expect(aud(['parent'], { memberRoles: ['coach', 'member'] }).roles).toEqual(['coach', 'parent']);
  });

  it('gives a club admin the club tools and nothing of the player side', () => {
    const admin = aud([], { admin: true });
    expect(admin.roles).toEqual([]);
    expect(menuFor(admin).map((g) => g.key)).toEqual(['club']);
    expect(hrefs(admin)).toContain('/admin/club/members');
    expect(hrefs(admin)).not.toContain('/play');
    expect(hrefs(admin)).not.toContain('/analyse');
  });

  it('gives a club admin who also plays both, with the club tools in their own group', () => {
    const both = aud(['player'], { admin: true });
    const keys = menuFor(both).map((g) => g.key);
    expect(keys).toContain('technique');
    expect(keys[keys.length - 1]).toBe('club');
    expect(hrefs(both)).toContain('/play');
    expect(hrefs(both)).toContain('/admin/club/members');
  });

  it('drops the default player when someone is found to be an admin another way', () => {
    const base = aud([]);
    expect(base.roles).toEqual(['player']);
    expect(asAdmin(base).roles).toEqual([]);
    expect(asAdmin(aud(['player'])).roles).toEqual(['player']);
  });

  it('shows SHIFTUP staff both sides', () => {
    const staff = asStaff(aud([]));
    expect(menuFor(staff).map((g) => g.key)).toEqual(['matchday', 'technique', 'community', 'wellness', 'academy', 'scores', 'club']);
  });

  it('parks raffles: nobody is shown the link while the flag is off', () => {
    expect(hrefs(aud(['player']))).not.toContain('/raffle');
  });

  it('parks volunteering: nobody is shown the link', () => {
    for (const r of ['player', 'coach', 'parent', 'volunteer']) expect(hrefs(aud([r]))).not.toContain('/volunteer');
  });

  it('keeps admin tools from everyone else', () => {
    for (const r of ['player', 'coach', 'parent', 'volunteer']) {
      expect(hrefs(aud([r]))).not.toContain('/admin/club/scout-mode');
      expect(menuFor(aud([r])).map((g) => g.key)).not.toContain('club');
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
    expect(audienceLabel(aud([], { admin: true }))).toBe('Club admin');
    expect(audienceLabel(aud(['player'], { admin: true }))).toBe('Club admin · Player');
    expect(audienceLabel(aud([], { junior: true }))).toBe('Junior player');
  });

  it('puts Match Day first, Cricket CV under Analysis, and Pulse Score outside Wellness', () => {
    const player = menuFor(aud(['player']));
    expect(player[0].key).toBe('matchday');
    const by = (k: string) => player.find((g) => g.key === k)!.links.map((l) => l.href);
    expect(by('matchday')).toEqual(expect.arrayContaining(['/availability', '/match-day', '/team-selection', '/gut-feeling', '/season-wrap']));
    expect(by('technique')).toContain('/cricket-cv');
    expect(by('community')).not.toContain('/cricket-cv');
    expect(by('wellness')).not.toContain('/pulse-score');
    expect(hrefs(aud(['player']))).not.toContain('/pulse-score');
    expect(player.find((g) => g.key === 'scores')!.label).toBe('Rewards');
  });

  it('gives players the full Wellness pillar and only coaches the team view', () => {
    const wellness = (r: ReturnType<typeof aud>) => (menuFor(r).find((g) => g.key === 'wellness')?.links ?? []).map((l) => l.href);
    expect(wellness(aud(['player']))).toEqual(expect.arrayContaining(['/wellness/skills', '/wellness/routine', '/wellness/recovery', '/wellness/settings', '/wellness/support', '/wellbeing', '/match-mood', '/injury-intel']));
    expect(wellness(aud(['player']))).not.toContain('/wellness/team');
    expect(wellness(aud(['coach']))).toContain('/wellness/team');
    expect(wellness(aud(['parent']))).toEqual([]);
  });

  it('keeps a parent out of team selection', () => {
    expect(hrefs(aud(['parent']))).not.toContain('/team-selection');
    expect(hrefs(aud(['parent']))).toContain('/match-day');
  });

  it('leads the club group with the five main tools', () => {
    const club = NAV_GROUPS.find((g) => g.key === 'club')!;
    expect(club.links.slice(0, 5).map((l) => l.href)).toEqual(['/admin/club', '/admin/club/availability', '/admin/club/members', '/admin/club/finance', '/admin/club/safeguarding']);
  });

  it('gives every phone tab bar five items and never Rewards', () => {
    for (const a of [aud(['player']), aud(['coach']), aud(['parent']), aud([], { admin: true }), aud([], { junior: true })]) {
      const links = bottomLinksFor(a);
      expect(links).toHaveLength(5);
      expect(links.map((l) => l.href)).not.toContain('/marketplace');
    }
    expect(bottomLinksFor(aud(['player'])).map((l) => l.label)).toEqual(['Home', 'Match Day', 'Analysis', 'Academy', 'Profile']);
    expect(bottomLinksFor(aud(['parent'])).map((l) => l.href)).not.toContain('/technique');
    expect(bottomLinksFor(aud([], { admin: true }))[0].href).toBe('/admin/club');
  });

  it('groups the menu by the four pillars, with rewards alongside', () => {
    expect(NAV_GROUPS.map((g) => g.key)).toEqual(['matchday', 'technique', 'community', 'wellness', 'academy', 'scores', 'club']);
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
    expect(player.map((s) => s.title)).toEqual(['My club', 'People', 'Together']);
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
