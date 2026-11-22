jest.mock('@/lib/supabase/request-auth', () => ({ getRequestAuth: async (req: { headers: Headers }) => ({ user: req.headers.get('x-test-user') ? { id: req.headers.get('x-test-user') } : null }) }));
jest.mock('@/lib/wellness/service', () => ({
  readinessToday: jest.fn(async () => ({ success: true, data: { date: '2026-11-22', readiness: null } })),
  readinessTrendFor: jest.fn(async () => ({ success: true, data: { days: [], rows: [] } })),
  saveReadinessFor: jest.fn(async () => ({ success: true, data: null })),
  recoveryLogFor: jest.fn(async () => ({ success: true, data: [] })),
  saveRecoveryFor: jest.fn(async () => ({ success: true, data: null })),
  deleteRecoveryFor: jest.fn(async () => ({ success: true, data: null })),
  shareSettingsFor: jest.fn(async () => ({ success: true, data: [] })),
  setShareFor: jest.fn(async () => ({ success: true, data: null })),
}));
jest.mock('@/lib/academy/service', () => ({ getCertificate: jest.fn(async (_u: string, k: string) => (k === 'skills' ? { name: 'Sam', title: 'Cricket skills', completedOn: '2026-11-22', graduate: false } : null)) }));

import { NextRequest } from 'next/server';
import * as readiness from '@/app/api/wellness/readiness/route';
import * as recovery from '@/app/api/wellness/recovery/route';
import * as share from '@/app/api/wellness/share/route';
import * as cert from '@/app/api/academy/certificate/[track]/route';
import * as svc from '@/lib/wellness/service';

const req = (path: string, method = 'GET', user?: string, body?: unknown) =>
  new NextRequest(`http://localhost${path}`, { method, headers: user ? { 'x-test-user': user } : {}, body: body === undefined ? undefined : JSON.stringify(body) });

describe('Wellness and certificate API', () => {
  it('turns away anyone who is not signed in, and writes nothing', async () => {
    for (const res of [
      await readiness.GET(req('/api/wellness/readiness')), await readiness.POST(req('/api/wellness/readiness', 'POST', undefined, { sleep: 3 })),
      await recovery.GET(req('/api/wellness/recovery')), await recovery.POST(req('/api/wellness/recovery', 'POST')), await recovery.DELETE(req('/api/wellness/recovery?id=x', 'DELETE')),
      await share.GET(req('/api/wellness/share')), await share.POST(req('/api/wellness/share', 'POST', undefined, { clubId: 'c', share: true })),
      await cert.GET(req('/api/academy/certificate/skills'), { params: Promise.resolve({ track: 'skills' }) }),
    ]) expect(res.status).toBe(401);
    expect(svc.saveReadinessFor).not.toHaveBeenCalled();
    expect(svc.setShareFor).not.toHaveBeenCalled();
  });
  it('always acts as the verified person, never as an id from the request', async () => {
    await readiness.POST(req('/api/wellness/readiness', 'POST', 'u1', { sleep: 4, userId: 'someone-else' }));
    expect((svc.saveReadinessFor as jest.Mock).mock.calls[0][0]).toBe('u1');
    await recovery.DELETE(req('/api/wellness/recovery?id=e1', 'DELETE', 'u1'));
    expect(svc.deleteRecoveryFor).toHaveBeenCalledWith('u1', 'e1');
  });
  it('needs a club and an on/off choice to change sharing', async () => {
    expect((await share.POST(req('/api/wellness/share', 'POST', 'u1', { clubId: 'c1' }))).status).toBe(400);
    expect((await share.POST(req('/api/wellness/share', 'POST', 'u1', { clubId: 'c1', share: false }))).status).toBe(200);
  });
  it('gives a certificate only for a finished track', async () => {
    expect((await cert.GET(req('/api/academy/certificate/skills', 'GET', 'u1'), { params: Promise.resolve({ track: 'skills' }) })).status).toBe(200);
    expect((await cert.GET(req('/api/academy/certificate/game', 'GET', 'u1'), { params: Promise.resolve({ track: 'game' }) })).status).toBe(404);
    expect((await cert.GET(req('/api/academy/certificate/nonsense', 'GET', 'u1'), { params: Promise.resolve({ track: 'nonsense' }) })).status).toBe(404);
  });
});
