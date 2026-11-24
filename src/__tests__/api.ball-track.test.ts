import { NextRequest } from 'next/server';

const getUser = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

import { POST as ball } from '@/app/api/analysis/ball-track/route';
import { POST as pose } from '@/app/api/analysis/pose-track/route';

const call = (post: typeof ball) => post(new NextRequest('http://localhost/api/analysis/ball-track', { method: 'POST' }));

describe('analysis upload routes', () => {
  beforeEach(() => getUser.mockReset());

  it('refuses ball tracking without a signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await call(ball);
    expect(res.status).toBe(401);
  });

  it('refuses pose tracking without a signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await call(pose);
    expect(res.status).toBe(401);
  });

  it('does not accept a video upload from a signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const ballRes = await call(ball);
    const poseRes = await call(pose);
    expect(ballRes.status).toBe(410);
    expect(poseRes.status).toBe(410);
    expect((await ballRes.json()).error).toMatch(/device/i);
    expect((await poseRes.json()).error).toMatch(/device/i);
  });
});
