// The profile route must go through getProfileGuarded, so an unrelated adult can never read a junior.

type Row = Record<string, unknown>;
const db: { members: Row[]; links: Row[]; junior: Set<string> } = { members: [], links: [], junior: new Set() };

jest.mock('@/lib/supabase/request-auth', () => ({ getRequestAuth: async (req: { headers: Headers }) => ({ user: { id: req.headers.get('x-test-user') } }) }));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const eq: Record<string, unknown> = {};
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = (k: string, v: unknown) => { eq[k] = v; return chain; };
      chain.limit = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        let data: Row[] = [];
        if (table === 'club_members') data = db.members.filter((m) => m.user_id === eq.user_id);
        if (table === 'child_profiles') data = db.links.filter((l) => l.linked_user_id === eq.linked_user_id && l.parent_id === eq['parent_child_links.parent_id']);
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return chain;
    },
  }),
}));
jest.mock('@/lib/community/service', () => ({
  ...jest.requireActual('@/lib/community/service'),
  communityOpen: () => true,
  people: async (_a: unknown, ids: string[]) => new Map(ids.map((id) => [id, { id, name: id, junior: db.junior.has(id) }])),
  getProfile: async (_v: string, subject: string) => ({ success: true, data: { id: subject } }),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/community/profile/route';

const as = (viewer: string, id: string) => GET(new NextRequest(`http://localhost/api/community/profile?id=${id}`, { headers: { 'x-test-user': viewer } }));

beforeEach(() => {
  db.junior = new Set(['kid']);
  db.members = [
    { user_id: 'kid', club_id: 'c1', role: 'player' },
    { user_id: 'coach', club_id: 'c1', role: 'coach' },
    { user_id: 'admin', club_id: 'c1', role: 'club_admin' },
    { user_id: 'teammate', club_id: 'c1', role: 'player' },
    { user_id: 'stranger', club_id: 'c2', role: 'player' },
    { user_id: 'otherCoach', club_id: 'c2', role: 'coach' },
  ];
  db.links = [{ linked_user_id: 'kid', parent_id: 'mum' }];
});

describe('GET /api/community/profile', () => {
  it('does not show a junior to an unrelated adult, or to an adult at the same club who is not staff', async () => {
    for (const viewer of ['stranger', 'teammate', 'otherCoach']) expect((await as(viewer, 'kid')).status).toBeGreaterThanOrEqual(400);
  });
  it('shows the junior to themselves, their linked parent, and a coach or admin of a shared club', async () => {
    for (const viewer of ['kid', 'mum', 'coach', 'admin']) {
      const res = await as(viewer, 'kid');
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe('kid');
    }
  });
  it('does not show the junior to a parent linked to a different child', async () => {
    expect((await as('someoneElsesMum', 'kid')).status).toBeGreaterThanOrEqual(400);
  });
  it('still lets adults see each other', async () => {
    expect((await as('stranger', 'teammate')).status).toBe(200);
  });
});
