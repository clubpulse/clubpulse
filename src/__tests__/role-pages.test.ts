import { NAV_GROUPS, type Audience } from '@/lib/nav/menu';
import { ROLE_PAGES, holdsRole, isRolePath, rolePagesFor, roleTools } from '@/lib/nav/role-pages';

const aud = (roles: Audience['roles'], extra: Partial<Audience> = {}): Audience => ({ roles, junior: false, admin: false, ...extra });

describe('role pages', () => {
  it('gives a page for each role held, in a fixed order', () => {
    expect(rolePagesFor(aud(['volunteer', 'player'])).map((p) => p.role)).toEqual(['player', 'volunteer']);
    expect(rolePagesFor(aud(['parent'])).map((p) => p.href)).toEqual(['/parent']);
  });

  it('lets a club admin open all four', () => {
    expect(rolePagesFor(aud(['player'], { admin: true }))).toHaveLength(4);
    expect(holdsRole(aud(['player'], { admin: true }), 'coach')).toBe(true);
    expect(holdsRole(aud(['player']), 'coach')).toBe(false);
  });

  it('only features tools that exist in the menu', () => {
    const known = new Set(NAV_GROUPS.flatMap((g) => g.links.map((l) => l.href)));
    for (const role of ['player', 'coach', 'parent', 'volunteer'] as const) {
      const tools = roleTools(role, aud([role]));
      expect(tools.length).toBeGreaterThanOrEqual(5);
      for (const t of tools) expect(known.has(t.href)).toBe(true);
    }
  });

  it('keeps each role to its own tools', () => {
    const parent = roleTools('parent', aud(['parent'])).map((t) => t.href);
    expect(parent).toContain('/fee-offset');
    expect(parent).not.toContain('/analyse');
    expect(roleTools('player', aud(['player'])).map((t) => t.href)).toContain('/analyse');
  });

  it('hides adults-only tools from a junior', () => {
    const junior = roleTools('parent', aud(['parent'], { junior: true })).map((t) => t.href);
    expect(junior).not.toContain('/fee-offset');
    expect(junior).not.toContain('/finance');
  });

  it('does not let a wider audience widen a role page', () => {
    // Someone who is both sees the parent page as a parent, not as a player
    expect(roleTools('parent', aud(['player', 'parent'])).map((t) => t.href)).not.toContain('/development');
  });

  it('recognises the four addresses', () => {
    expect(isRolePath(ROLE_PAGES.coach.href)).toBe(true);
    expect(isRolePath('/coaching')).toBe(false);
    expect(isRolePath('/player-report')).toBe(false);
  });
});
