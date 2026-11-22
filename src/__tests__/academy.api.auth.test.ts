jest.mock('@/lib/supabase/request-auth', () => ({ getRequestAuth: async () => ({ user: null }) }));
jest.mock('@/lib/academy/service', () => ({ submitLesson: jest.fn(), getAcademyLesson: jest.fn(), createPlan: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/academy/lessons/[id]/route';
import { submitLesson } from '@/lib/academy/service';

describe('academy lesson API', () => {
  it('does not record progress for someone who is not signed in', async () => {
    const req = new NextRequest('http://localhost/api/academy/lessons/skills-grip-stance', { method: 'POST', body: JSON.stringify({ answers: [0, 1, 2] }) });
    const res = await POST(req, { params: Promise.resolve({ id: 'skills-grip-stance' }) });
    expect(res.status).toBe(401);
    expect(submitLesson).not.toHaveBeenCalled();
  });
});
