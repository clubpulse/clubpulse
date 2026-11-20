import { NAV_GROUPS, type Audience } from '@/lib/nav/menu';
import { ROLE_PAGES, holdsRole, isRolePath, rolePagesFor, roleTools } from '@/lib/nav/role-pages';

const aud = (roles: Audience['roles'], extra: Partial<Audience> = {}): Audience => ({ roles, junior: false, admin: false, ...extra });

describe('role pages', () => {
  it('has four: player, coach, parent and admin', () => {
    expect(rolePagesFor(aud(['player', 'coach', 'parent', 'volunteer'], { admin: true })).map((p) => p.role)).toEqual(['player', 'coach', 'parent', 'admin']);
  });

  it('gives a page for each role held, in a fixed order', () => {
    expect(rolePagesFor(aud(['parent', 'player'])).map((p) => p.role)).toEqual(['player', 'parent']);
    expect(rolePagesFor(aud(['parent'])).map((p) => p.href)).toEqual(['/parent']);
  });

  it('keeps the admin page for club admins only', () => {
    expect(holdsRole(aud(['player']), 'admin')).toBe(false);
    expect(holdsRole(aud(['player'], { admin: true }), 'admin')).toBe(true);
    expect(rolePagesFor(aud(['coach'])).map((p) => p.role)).not.toContain('admin');
  });

  it('lets a club admin open every page', () => {
    expect(holdsRole(aud(['player'], { admin: true }), 'coach')).toBe(true);
    expect(holdsRole(aud(['player']), 'coach')).toBe(false);
  });

  it('does not list volunteering as a role, but lets every member open it', () => {
    expect(rolePagesFor(aud(['volunteer'])).map((p) => p.role)).not.toContain('volunteer');
    expect(holdsRole(aud(['parent']), 'volunteer')).toBe(true);
    const community = NAV_GROUPS.find((g) => g.key === 'community')!.links.map((l) => l.href);
    expect(community).toContain(ROLE_PAGES.volunteer.href);
  });

  it('only features member tools that exist in the menu', () => {
    const known = new Set(NAV_GROUPS.flatMap((g) => g.links.map((l) => l.href)));
    for (const role of ['player', 'coach', 'parent', 'volunteer'] as const) {
      const tools = roleTools(role, aud([role]));
      expect(tools.length).toBeGreaterThanOrEqual(5);
      for (const t of tools) expect(known.has(t.href)).toBe(true);
    }
  });

  it('gives the admin page the club admin tools', () => {
    const tools = roleTools('admin', aud(['player'], { admin: true })).map((t) => t.href);
    expect(tools[0]).toBe('/admin/club');
    expect(tools).toContain('/admin/club/members');
    expect(new Set(tools).size).toBe(tools.length);
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
    expect(roleTools('parent', aud(['player', 'parent'])).map((t) => t.href)).not.toContain('/development');
  });

  it('recognises the four addresses', () => {
    expect(isRolePath(ROLE_PAGES.coach.href)).toBe(true);
    expect(isRolePath(ROLE_PAGES.admin.href)).toBe(true);
    expect(isRolePath('/coaching')).toBe(false);
    expect(isRolePath('/volunteer')).toBe(false);
  });
});
