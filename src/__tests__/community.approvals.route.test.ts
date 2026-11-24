// The app's parent-approval API: the same decisions as the website, nothing looser.
import { NextRequest } from 'next/server';

const getApprovalsForParent = jest.fn(); const decideJuniorConnection = jest.fn();
jest.mock('@/lib/community/junior-approval', () => ({ getApprovalsForParent: (...a: unknown[]) => getApprovalsForParent(...a), decideJuniorConnection: (...a: unknown[]) => decideJuniorConnection(...a) }));
jest.mock('@/lib/supabase/request-auth', () => ({ getRequestAuth: async (req: { headers: Headers }) => ({ user: req.headers.get('x-test-user') ? { id: req.headers.get('x-test-user') } : null }) }));

import { GET, POST } from '@/app/api/community/approvals/route';

const call = (method: 'GET' | 'POST', user: string | null, body?: unknown) => {
  const req = new NextRequest('http://localhost/api/community/approvals', { method, headers: { ...(user ? { 'x-test-user': user } : {}), 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return (method === 'GET' ? GET : POST)(req);
};
const open = () => { process.env.COMMUNITY_ENABLED = 'true'; process.env.COMMUNITY_JUNIORS_ENABLED = 'true'; };
beforeEach(() => { getApprovalsForParent.mockReset(); decideJuniorConnection.mockReset(); delete process.env.COMMUNITY_ENABLED; delete process.env.COMMUNITY_JUNIORS_ENABLED; });
afterAll(() => { delete process.env.COMMUNITY_ENABLED; delete process.env.COMMUNITY_JUNIORS_ENABLED; });

describe('GET /api/community/approvals', () => {
  it('needs a signed-in parent, the Community, and under-18s switched on', async () => {
    expect((await call('GET', null)).status).toBe(401);
    expect((await call('GET', 'mum')).status).toBe(404);
    process.env.COMMUNITY_ENABLED = 'true';
    const r = await call('GET', 'mum');
    expect(r.status).toBe(404);
    expect(JSON.stringify(await r.json())).toContain('under-18s');
    expect(getApprovalsForParent).not.toHaveBeenCalled();
  });
  it('returns what is waiting on this parent only', async () => {
    open();
    getApprovalsForParent.mockResolvedValue({ success: true, data: [{ connectionId: 'c1', childId: 'k1', childName: 'Kit', otherName: 'Kay', otherClub: 'Fairwick CC', decided: null }] });
    const r = await call('GET', 'mum');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ approvals: [expect.objectContaining({ connectionId: 'c1', childName: 'Kit' })] });
    expect(getApprovalsForParent).toHaveBeenCalledWith('mum');
  });
});

describe('POST /api/community/approvals', () => {
  it('is closed to the signed-out, and while the Community or under-18s are off', async () => {
    expect((await call('POST', null, { connectionId: 'c1', childId: 'k1', approve: true })).status).toBe(401);
    expect((await call('POST', 'mum', { connectionId: 'c1', childId: 'k1', approve: true })).status).toBe(404);
    process.env.COMMUNITY_ENABLED = 'true';
    expect((await call('POST', 'mum', { connectionId: 'c1', childId: 'k1', approve: true })).status).toBe(404);
    expect(decideJuniorConnection).not.toHaveBeenCalled();
  });
  it.each([
    ['no body', undefined], ['empty', {}], ['approve missing', { connectionId: 'c1', childId: 'k1' }],
    ['approve as a string', { connectionId: 'c1', childId: 'k1', approve: 'true' }], ['approve as 1', { connectionId: 'c1', childId: 'k1', approve: 1 }],
    ['no child', { connectionId: 'c1', approve: true }], ['no connection', { childId: 'k1', approve: false }],
  ])('refuses %s and decides nothing', async (_n, body) => {
    open();
    expect((await call('POST', 'mum', body)).status).toBe(400);
    expect(decideJuniorConnection).not.toHaveBeenCalled();
  });
  it('passes an approval and a decline to the same service the website uses, as the signed-in parent', async () => {
    open();
    decideJuniorConnection.mockResolvedValue({ success: true, data: { state: 'waiting' } });
    expect(await (await call('POST', 'mum', { connectionId: 'c1', childId: 'k1', approve: true })).json()).toEqual({ state: 'waiting' });
    expect(decideJuniorConnection).toHaveBeenLastCalledWith('mum', 'c1', 'k1', true);
    decideJuniorConnection.mockResolvedValue({ success: true, data: { state: 'declined' } });
    await call('POST', 'mum', { connectionId: 'c1', childId: 'k1', approve: false });
    expect(decideJuniorConnection).toHaveBeenLastCalledWith('mum', 'c1', 'k1', false);
  });
  it('never takes the parent from the body', async () => {
    open();
    decideJuniorConnection.mockResolvedValue({ success: true, data: { state: 'waiting' } });
    await call('POST', 'mum', { connectionId: 'c1', childId: 'k1', approve: true, parentId: 'someone-else', userId: 'someone-else' });
    expect(decideJuniorConnection.mock.calls[0][0]).toBe('mum');
  });
  it('turns a service refusal into an error, not a success', async () => {
    open();
    decideJuniorConnection.mockResolvedValue({ success: false, error: 'Request not found.' });
    expect((await call('POST', 'mum', { connectionId: 'c1', childId: 'k1', approve: true })).status).toBe(404);
  });
});
