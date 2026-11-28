/**
 * @jest-environment node
 */
// The four review blockers, the resolved-flag fix and the no-welfare-officer screen.
import fs from 'fs';
import path from 'path';
import { statedb, statedbClient } from './helpers/statedb';

const order: string[] = [];
let userId: string | null = 'coach-1';

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) } }),
}));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    const base = statedbClient();
    return { ...base, from: (t: string) => { order.push(t); return base.from(t); } };
  },
}));
jest.mock('@/lib/email/resend', () => ({ sendEmail: async () => true }));
jest.mock('@/lib/admin/child-link', () => ({ hasCurrentDbsAt: async () => dbsOk }));
let dbsOk = true;

import { POST as ageCheck } from '@/app/api/account/age-check/route';
import { acceptedAgePass, mockAgeCheckBlocked, mockAgeProvider, resolveAgeProvider, runAdultAgeCheck } from '@/lib/age-verification/provider';
import { adminAssignAgeGroup } from '@/lib/actions/schools';
import { PLAYER_DOB_HOLD } from '@/lib/age-verification/rules';
import { listFlagsForClubWithoutOfficer, resolveSquadFlag } from '@/lib/age-verification/flags';
import { guardSquad } from '@/lib/age-verification/squad';

const saved = { ...process.env };
afterAll(() => { process.env = saved; });
function env(values: Record<string, string | undefined>) {
  for (const k of ['AGE_VERIFICATION_ENABLED', 'AGE_VERIFICATION_PROVIDER_ENABLED', 'AGE_VERIFICATION_PROVIDER', 'VERCEL_ENV', 'NODE_ENV', 'SAFEGUARDING_LEAD_EMAIL']) delete (process.env as Record<string, string | undefined>)[k];
  Object.assign(process.env, values);
}

describe('blocker 1: the mock age check can never run in production', () => {
  const on = { AGE_VERIFICATION_ENABLED: 'true', AGE_VERIFICATION_PROVIDER_ENABLED: 'true', AGE_VERIFICATION_PROVIDER: 'mock' };

  it.each([
    ['VERCEL_ENV production', { VERCEL_ENV: 'production', NODE_ENV: 'development' }],
    ['NODE_ENV production', { NODE_ENV: 'production' }],
    ['both production', { VERCEL_ENV: 'production', NODE_ENV: 'production' }],
  ])('resolves no provider and refuses the check (%s)', async (_label, prod) => {
    const e = { ...on, ...prod } as Record<string, string>;
    expect(mockAgeCheckBlocked(e)).toBe(true);
    expect(resolveAgeProvider(e)).toBeNull();
    expect(await runAdultAgeCheck({ age: 30, hasClub: false }, e)).toBe('unavailable');
  });

  it('the stub itself fails when called in production, and passes only outside it', async () => {
    env({ NODE_ENV: 'production' });
    expect(await mockAgeProvider.checkAdult()).toBe('failed');
    env({ VERCEL_ENV: 'production', NODE_ENV: 'test' });
    expect(await mockAgeProvider.checkAdult()).toBe('failed');
    env({ NODE_ENV: 'test' });
    expect(await mockAgeProvider.checkAdult()).toBe('passed');
  });

  it('a stored mock pass never counts as verified', () => {
    expect(acceptedAgePass({ status: 'passed', provider: 'mock' })).toBe(false);
    expect(acceptedAgePass({ status: 'passed', provider: null })).toBe(false);
    expect(acceptedAgePass({ status: 'passed', provider: 'real-vendor' })).toBe(true);
  });

  it('the route answers 404 in production and writes nothing', async () => {
    statedb.reset({ profiles: [{ id: 'u1', date_of_birth: '1990-01-01' }], club_members: [], age_verifications: [] });
    order.length = 0;
    userId = 'u1';
    env({ ...on, NODE_ENV: 'production' });
    const res = await ageCheck();
    expect(res.status).toBe(404);
    expect(order).toEqual([]);
    expect(statedb.tables.age_verifications).toEqual([]);
  });

  it('the route also answers 404 while the main flag is off', async () => {
    env({ AGE_VERIFICATION_PROVIDER_ENABLED: 'true', AGE_VERIFICATION_PROVIDER: 'mock', NODE_ENV: 'test' });
    expect((await ageCheck()).status).toBe(404);
  });
});

describe('blocker 2: squad checks run after the permission check', () => {
  beforeEach(() => { env({ AGE_VERIFICATION_ENABLED: 'true', NODE_ENV: 'test' }); order.length = 0; userId = 'coach-1'; });

  it('for someone without permission, no verification table is read and nothing is written', async () => {
    statedb.reset({ club_members: [{ user_id: 'coach-1', club_id: 'c1', is_active: true, role: 'player' }], profiles: [], age_squad_mismatches: [], safeguarding_incidents: [] });
    const res = await adminAssignAgeGroup('p1', 'c1', 'U15');
    expect(res).toEqual({ success: false, error: 'Only club admins and coaches can do this.' });
    expect(order).toEqual(['club_members']);
    expect(statedb.tables.age_squad_mismatches).toEqual([]);
    expect(statedb.tables.safeguarding_incidents).toEqual([]);
  });

  it('for a coach, the permission read comes first and the age reads come after it', async () => {
    statedb.reset({
      club_members: [{ user_id: 'coach-1', club_id: 'c1', is_active: true, role: 'coach' }],
      profiles: [], age_squad_mismatches: [], age_verifications: [], guardian_consents: [], child_profiles: [], safeguarding_incidents: [],
    });
    await adminAssignAgeGroup('p1', 'c1', 'U15');
    expect(order[0]).toBe('club_members');
    const firstAgeRead = order.findIndex((t) => t === 'age_squad_mismatches' || t === 'profiles');
    expect(firstAgeRead).toBeGreaterThan(0);
  });
});

describe('blocker 3: a player cannot read their own mismatch flag', () => {
  it('the policy in force does not allow user_id = auth.uid(), and no player-facing code reads the table', () => {
    const dir = path.join(__dirname, '../../supabase/migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    let last = '';
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      const m = sql.match(/CREATE POLICY age_squad_mismatch_read[\s\S]*?;\s*(?=\n|$)/);
      if (m) last = m[0];
    }
    expect(last).not.toBe('');
    expect(last).not.toMatch(/user_id\s*=\s*auth\.uid\(\)\s*(OR|\))/i);
    expect(last).toMatch(/dbs_checks/);
    expect(last).toMatch(/enhanced/);
    const hold = fs.readFileSync(path.join(__dirname, '../lib/age-verification/squad.ts'), 'utf8');
    expect(hold).toContain('PLAYER_DOB_HOLD');
    expect(PLAYER_DOB_HOLD).not.toMatch(/mismatch|junior|squad|age band/i);
  });
});

describe('blocker 4: under-13 form sign-ups create a guardian email record', () => {
  it('is covered by guardian-consent.test.ts, which signs an under-13 up and finds the stored record', () => {
    const t = fs.readFileSync(path.join(__dirname, 'guardian-consent.test.ts'), 'utf8');
    expect(t).toMatch(/creates a consent row and emails the guardian/);
    expect(t).toMatch(/refuses an under-13 with no guardian email and stores nothing/);
  });

  it('sign-up with the age rules on does not send a second email or write a second record', async () => {
    jest.resetModules();
    const sendEmail = jest.fn(async (_m: { to: string }) => true);
    jest.doMock('@/lib/email/resend', () => ({ sendEmail }));
    statedb.reset({ profiles: [], user_roles: [], guardian_consents: [] });
    userId = 'kid-1';
    env({ AGE_VERIFICATION_ENABLED: 'true', NODE_ENV: 'test', NEXT_PUBLIC_APP_URL: 'https://app.test' });
    const { completeSignup } = await import('@/app/auth/signup/actions');
    const res = await completeSignup({ userId: 'kid-1', fullName: 'Kid One', email: 'kid@example.com', roles: ['player'], dateOfBirth: '2016-05-05', guardianEmail: 'parent@example.com' });
    expect(res).toEqual({ success: true });
    expect(statedb.tables.guardian_consents.filter((r) => r.user_id === 'kid-1')).toHaveLength(1);
    expect(sendEmail.mock.calls.filter((c) => c[0].to === 'parent@example.com')).toHaveLength(1);
  });
});

describe('a resolved flag', () => {
  const base = () => ({
    club_members: [
      { user_id: 'officer-1', club_id: 'c1', is_active: true, role: 'welfare_officer' },
      { user_id: 'coach-1', club_id: 'c1', is_active: true, role: 'coach' },
      { user_id: 'p1', club_id: 'c1', is_active: true, role: 'player', is_junior: false },
    ],
    age_squad_mismatches: [{ id: 'f1', club_id: 'c1', user_id: 'p1', age_group: 'U15', reason: 'unverified', incident_id: 'i1', resolved_at: null }],
    safeguarding_incidents: [{ id: 'i1', club_id: 'c1', status: 'reported', resolved_at: null }],
    profiles: [{ id: 'p1', full_name: 'P One', date_of_birth: '1990-01-01' }],
    age_verifications: [], guardian_consents: [], child_profiles: [],
  });
  beforeEach(() => { env({ AGE_VERIFICATION_ENABLED: 'true', NODE_ENV: 'test' }); dbsOk = true; statedb.reset(base()); });

  it('blocks the player while open', async () => {
    const res = await guardSquad(statedbClient() as never, { clubId: 'c1', actorId: 'coach-1', userIds: ['p1'], ageGroup: 'U15' });
    expect(res).toEqual({ ok: false, error: PLAYER_DOB_HOLD });
  });

  it('closes the flag and its safeguarding incident together, once', async () => {
    expect(await resolveSquadFlag('officer-1', 'c1', 'f1')).toEqual({ success: true });
    expect(statedb.tables.age_squad_mismatches[0]).toMatchObject({ resolved_by: 'officer-1' });
    expect(statedb.tables.age_squad_mismatches[0].resolved_at).toBeTruthy();
    expect(statedb.tables.safeguarding_incidents[0]).toMatchObject({ status: 'resolved' });
    expect(statedb.tables.safeguarding_incidents[0].resolved_at).toBeTruthy();
    expect(await resolveSquadFlag('officer-1', 'c1', 'f1')).toEqual({ success: false, error: 'Could not resolve that flag.' });
  });

  it('does not close an incident from another club', async () => {
    statedb.tables.safeguarding_incidents[0].club_id = 'other';
    await resolveSquadFlag('officer-1', 'c1', 'f1');
    expect(statedb.tables.safeguarding_incidents[0].status).toBe('reported');
  });

  it('reports a failed incident update instead of saying it all worked', async () => {
    statedb.failOn = 'safeguarding_incidents';
    const res = await resolveSquadFlag('officer-1', 'c1', 'f1');
    statedb.failOn = null;
    expect(res.success).toBe(false);
  });

  it('only a welfare officer with a current DBS check can resolve', async () => {
    expect(await resolveSquadFlag('coach-1', 'c1', 'f1')).toMatchObject({ success: false });
    dbsOk = false;
    expect(await resolveSquadFlag('officer-1', 'c1', 'f1')).toMatchObject({ success: false });
    expect(statedb.tables.age_squad_mismatches[0].resolved_at).toBeNull();
  });

  it('does not wave the player through: still unverified after the flag is closed, so it is flagged again', async () => {
    await resolveSquadFlag('officer-1', 'c1', 'f1');
    const res = await guardSquad(statedbClient() as never, { clubId: 'c1', actorId: 'coach-1', userIds: ['p1'], ageGroup: 'U15' });
    expect(res).toEqual({ ok: false, error: PLAYER_DOB_HOLD });
    expect(statedb.tables.age_squad_mismatches.filter((r) => r.resolved_at == null)).toHaveLength(1);
  });
});

describe('the screen for a club with no welfare officer', () => {
  beforeEach(() => {
    env({ AGE_VERIFICATION_ENABLED: 'true', NODE_ENV: 'test', SAFEGUARDING_LEAD_EMAIL: 'lead@shiftup.test' });
    dbsOk = true;
    statedb.reset({
      club_members: [{ user_id: 'admin-1', club_id: 'c1', is_active: true, role: 'club_admin' }, { user_id: 'p1', club_id: 'c1', is_active: true, role: 'player' }],
      age_squad_mismatches: [{ id: 'f1', club_id: 'c1', user_id: 'p1', age_group: 'U15', reason: 'mismatch', created_at: '2026-11-20T10:00:00Z', resolved_at: null }],
      age_verification_purges: [
        { id: 'r1', club_ids: ['c1'], purged_at: '2026-11-25T00:00:00Z', alert_sent_at: null },
        { id: 'r2', club_ids: ['other'], purged_at: '2026-11-25T00:00:00Z', alert_sent_at: '2026-11-25T00:01:00Z' },
      ],
    });
  });

  it('shows open flags and deletion records, read only, and names where alerts go', async () => {
    const res = await listFlagsForClubWithoutOfficer('admin-1', 'c1');
    expect(res.noWelfareOfficer).toBe(true);
    expect(res.alertTo).toBe('lead@shiftup.test');
    expect(res.items.map((i) => i.id)).toEqual(['f1']);
    expect(res.purges).toEqual([{ id: 'r1', purgedAt: '2026-11-25T00:00:00Z', alertSent: false }]);
    expect(JSON.stringify(res)).not.toMatch(/date_of_birth|dob/i);
  });

  it('does not show for a club that has a welfare officer', async () => {
    statedb.tables.club_members.push({ user_id: 'o1', club_id: 'c1', is_active: true, role: 'welfare_officer' });
    expect(await listFlagsForClubWithoutOfficer('admin-1', 'c1')).toMatchObject({ noWelfareOfficer: false, items: [], purges: [] });
  });

  it('refuses anyone who is not a DBS-checked club admin', async () => {
    expect((await listFlagsForClubWithoutOfficer('p1', 'c1')).items).toEqual([]);
    dbsOk = false;
    const res = await listFlagsForClubWithoutOfficer('admin-1', 'c1');
    expect(res.items).toEqual([]);
    expect(res.error).toMatch(/DBS/);
  });

  it('is off with the flag', async () => {
    env({ NODE_ENV: 'test' });
    expect(await listFlagsForClubWithoutOfficer('admin-1', 'c1')).toMatchObject({ noWelfareOfficer: false, items: [] });
  });

  it('squad alerts for this club go to the safeguarding lead', async () => {
    const sent: string[] = [];
    jest.resetModules();
    jest.doMock('@/lib/email/resend', () => ({ sendEmail: async (m: { to: string }) => { sent.push(m.to); return true; } }));
    statedb.tables.age_squad_mismatches = [];
    statedb.tables.profiles = [{ id: 'p1', full_name: 'P One', date_of_birth: '2016-01-01' }];
    Object.assign(statedb.tables, { age_verifications: [], guardian_consents: [], child_profiles: [], safeguarding_incidents: [] });
    const { guardSquad: guard } = await import('@/lib/age-verification/squad');
    const res = await guard(statedbClient() as never, { clubId: 'c1', actorId: 'admin-1', userIds: ['p1'], ageGroup: 'Open' });
    expect(res.ok).toBe(false);
    expect(sent).toContain('lead@shiftup.test');
  });
});
