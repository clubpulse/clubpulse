// Smoke test for every Community API route, with no database: with the Community switched off every route refuses and
// touches nothing; switched on, every route refuses someone who is not signed in. The adult-to-junior routes also
// need their own flag.

import { NextRequest } from 'next/server';

const touched = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => new Proxy({}, { get: () => { touched(); throw new Error('database touched'); } }) }));
let signedIn = true;
jest.mock('@/lib/supabase/request-auth', () => ({ getRequestAuth: async () => ({ user: signedIn ? { id: 'u1' } : null }) }));

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const ROUTES: Array<[string, () => Promise<Record<string, Handler | undefined>>]> = [
  ['approvals', () => import('@/app/api/community/approvals/route') as never],
  ['clubs', () => import('@/app/api/community/clubs/route') as never],
  ['connections', () => import('@/app/api/community/connections/route') as never],
  ['feed', () => import('@/app/api/community/feed/route') as never],
  ['follow', () => import('@/app/api/community/follow/route') as never],
  ['guardian', () => import('@/app/api/community/guardian/route') as never],
  ['messages', () => import('@/app/api/community/messages/[id]/route') as never],
  ['nearby', () => import('@/app/api/community/nearby/route') as never],
  ['notifications', () => import('@/app/api/community/notifications/route') as never],
  ['comments', () => import('@/app/api/community/posts/[id]/comments/route') as never],
  ['like', () => import('@/app/api/community/posts/[id]/like/route') as never],
  ['profile', () => import('@/app/api/community/profile/route') as never],
  ['safety', () => import('@/app/api/community/safety/route') as never],
  ['sessions', () => import('@/app/api/community/sessions/route') as never],
  ['shortages', () => import('@/app/api/community/shortages/route') as never],
];
const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

async function callAll(): Promise<Array<{ route: string; method: string; status: number }>> {
  const out: Array<{ route: string; method: string; status: number }> = [];
  for (const [route, load] of ROUTES) {
    const mod = await load();
    for (const method of METHODS) {
      const h = mod[method];
      if (!h) continue;
      const req = new NextRequest('http://localhost/api/community/x', { method, ...(method === 'GET' ? {} : { body: '{}', headers: { 'content-type': 'application/json' } }) });
      const res = await h(req, { params: Promise.resolve({ id: 'x' }) });
      out.push({ route, method, status: res.status });
    }
  }
  return out;
}

beforeEach(() => { touched.mockClear(); signedIn = true; delete process.env.COMMUNITY_ENABLED; delete process.env.COMMUNITY_CROSSBAND_ENABLED; });
afterAll(() => { delete process.env.COMMUNITY_ENABLED; delete process.env.COMMUNITY_CROSSBAND_ENABLED; });

describe('Community API smoke test', () => {
  it('covers every route file', async () => {
    const { execSync } = await import('node:child_process');
    const found = execSync('find src/app/api/community -name route.ts', { encoding: 'utf8' }).trim().split('\n').length;
    expect(found).toBe(ROUTES.length);
  });

  it('refuses everything while the Community is off, and never touches the database', async () => {
    const results = await callAll();
    expect(results.length).toBeGreaterThan(20);
    for (const r of results) expect([r.route, r.method, r.status]).toEqual([r.route, r.method, 404]);
    expect(touched).not.toHaveBeenCalled();
  });

  it('refuses a signed-out caller on every route, with the Community on', async () => {
    process.env.COMMUNITY_ENABLED = 'true'; signedIn = false;
    const results = await callAll();
    for (const r of results) expect([r.route, r.method, r.status]).toEqual([r.route, r.method, 401]);
    expect(touched).not.toHaveBeenCalled();
  });

  it('keeps the adult-to-junior routes shut without their own flag', async () => {
    process.env.COMMUNITY_ENABLED = 'true';
    const mod = await ROUTES.find(([n]) => n === 'guardian')![1]();
    for (const method of ['GET', 'POST']) {
      const req = new NextRequest('http://localhost/api/community/guardian', { method, ...(method === 'GET' ? {} : { body: '{}', headers: { 'content-type': 'application/json' } }) });
      expect((await mod[method]!(req, { params: Promise.resolve({}) })).status).toBe(404);
    }
    expect(touched).not.toHaveBeenCalled();
  });
});
