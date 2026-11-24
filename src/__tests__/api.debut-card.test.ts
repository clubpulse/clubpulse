import { NextRequest } from 'next/server';

const getUser = jest.fn();
const maybeSingle = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

import { GET } from '@/app/api/debut-card/[userId]/route';

const call = (userId: string) =>
  GET(new NextRequest(`http://localhost/api/debut-card/${userId}`), { params: Promise.resolve({ userId }) });

describe('GET /api/debut-card/[userId]', () => {
  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
  });

  it('requires a signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await call('user-1');
    expect(res.status).toBe(401);
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('refuses a card for someone else', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const res = await call('user-2');
    expect(res.status).toBe(403);
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('draws the signed-in player from profiles', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    maybeSingle.mockResolvedValue({
      data: { full_name: 'A. Patel', display_name: 'A. Patel', primary_sport: 'cricket', created_at: '2026-04-01T00:00:00Z' },
    });
    const res = await call('user-1');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/svg/);
    const svg = await res.text();
    expect(svg).toContain('Patel');
    expect(svg).toContain('CRICKET');
    expect(svg).not.toContain('user_profiles');
  });
});
