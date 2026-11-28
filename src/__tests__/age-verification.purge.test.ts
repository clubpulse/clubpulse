/**
 * @jest-environment node
 */
import { statedb, statedbClient } from './helpers/statedb';

const deleted: string[] = [];
let deleteFails = false;
const sent: Array<{ to: string; subject: string; text: string }> = [];
let emailOk = true;

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    ...statedbClient(),
    auth: { admin: { deleteUser: async (id: string) => { if (deleteFails) return { error: { message: 'boom' } }; deleted.push(id); return { error: null }; } } },
  }),
}));
jest.mock('@/lib/email/resend', () => ({
  sendEmail: async (m: { to: string; subject: string; text: string }) => { if (emailOk) sent.push(m); return emailOk; },
}));

import { GET } from '@/app/api/cron/age-verification-purge/route';

const old = '2026-11-01T00:00:00Z';
const kid = (id: string, extra: Record<string, unknown> = {}) => ({ id, date_of_birth: '2016-03-01', created_at: old, dob_confirmed_by: null, dob_confirmed_at: null, ...extra });
const call = () => GET(new Request('http://x/api/cron/age-verification-purge', { headers: { authorization: 'Bearer s3cret' } }));

describe('purging unconfirmed under-13 accounts', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.CRON_SECRET = 's3cret';
    process.env.AGE_VERIFICATION_ENABLED = 'true';
    delete process.env.SAFEGUARDING_LEAD_EMAIL;
    deleted.length = 0; sent.length = 0; deleteFails = false; emailOk = true;
    statedb.failOn = null;
    statedb.reset({
      profiles: [kid('kid-1'), kid('kid-2'), { id: 'officer-1', email: 'welfare@club.test' }],
      club_members: [
        { user_id: 'kid-1', club_id: 'club-a', is_active: true, role: 'player' },
        { user_id: 'officer-1', club_id: 'club-a', is_active: true, role: 'welfare_officer' },
      ],
      guardian_consents: [], child_profiles: [], age_verification_purges: [],
    });
  });
  afterAll(() => { process.env = env; });

  it('keeps a lasting record, deletes the account and tells the welfare officer of the club', async () => {
    const body = await (await call()).json();
    expect(deleted).toContain('kid-1');
    const record = statedb.tables.age_verification_purges.find((r) => r.purged_user_id === 'kid-1')!;
    expect(record).toMatchObject({ club_ids: ['club-a'], reason: 'under_13_no_guardian_confirmation_after_14_days' });
    expect(record.purged_at).toBeTruthy();
    expect(record.alert_sent_at).toBeTruthy();
    expect(sent.some((m) => m.to === 'welfare@club.test' && m.text.includes(record.id as string))).toBe(true);
    expect(body.purgeAlertsSent).toBeGreaterThanOrEqual(1);
  });

  it('never puts a name, an email address or a date of birth in the record or the alert', async () => {
    await call();
    const record = statedb.tables.age_verification_purges[0];
    expect(Object.keys(record).sort()).toEqual(['alert_sent_at', 'club_ids', 'id', 'purged_at', 'purged_user_id', 'reason'].sort());
    for (const m of sent) {
      expect(m.text).not.toMatch(/2016|@|kid-1/);
    }
  });

  it('sends to SAFEGUARDING_LEAD_EMAIL when the club has no welfare officer, or the person had no club', async () => {
    process.env.SAFEGUARDING_LEAD_EMAIL = 'lead@shiftup.test';
    statedb.tables.club_members = [{ user_id: 'kid-1', club_id: 'club-a', is_active: true, role: 'player' }];
    await call();
    const recipients = sent.map((m) => m.to);
    expect(recipients).toContain('lead@shiftup.test');
    expect(recipients).not.toContain('welfare@club.test');
  });

  it('does not delete when the lasting record cannot be saved', async () => {
    statedb.failOn = 'age_verification_purges';
    await call();
    expect(deleted).toEqual([]);
  });

  it('keeps the record and retries the alert on the next run when the email fails', async () => {
    emailOk = false;
    const first = await (await call()).json();
    expect(deleted).toContain('kid-1');
    expect(first.purgeAlertsFailed).toBeGreaterThanOrEqual(1);
    const record = statedb.tables.age_verification_purges[0];
    expect(record.alert_sent_at).toBeFalsy();
    expect(record.alert_attempts).toBeGreaterThanOrEqual(1);
    emailOk = true;
    statedb.tables.profiles = statedb.tables.profiles.filter((p) => p.id !== 'kid-1' && p.id !== 'kid-2');
    await call();
    expect(statedb.tables.age_verification_purges[0].alert_sent_at).toBeTruthy();
  });

  it('keeps one record per account if the job runs again after a failed delete', async () => {
    deleteFails = true;
    await call();
    expect(deleted).toEqual([]);
    expect(statedb.tables.age_verification_purges.filter((r) => r.purged_user_id === 'kid-1')).toHaveLength(1);
    expect(statedb.tables.age_verification_purges[0].purged_at).toBeFalsy();
    deleteFails = false;
    await call();
    expect(statedb.tables.age_verification_purges.filter((r) => r.purged_user_id === 'kid-1')).toHaveLength(1);
    expect(statedb.tables.age_verification_purges.find((r) => r.purged_user_id === 'kid-1')!.purged_at).toBeTruthy();
  });

  it('does nothing while the flag is off', async () => {
    process.env.AGE_VERIFICATION_ENABLED = 'false';
    const body = await (await call()).json();
    expect(body).toEqual({ skipped: true });
    expect(deleted).toEqual([]);
    expect(statedb.tables.age_verification_purges).toEqual([]);
  });
});
