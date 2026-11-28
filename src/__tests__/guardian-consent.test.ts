// Under-13 guardian consent: sign-up must email a parent, the dashboard can resend, and the email link
// confirms only when the parent posts the form. A scanner fetching the link must not approve it.
import { createHash } from 'crypto';
import type { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};

function chain(table: string) {
  const filters: Array<(row: Row) => boolean> = [];
  let op: 'select' | 'insert' | 'update' | 'upsert' | null = null;
  let payload: Row | Row[] | null = null;
  let single = false;
  const c: Record<string, unknown> = {};
  c.select = () => { if (!op) op = 'select'; return c; };
  c.eq = (k: string, v: unknown) => { filters.push((r) => r[k] === v); return c; };
  c.is = (k: string, v: unknown) => { filters.push((r) => (v === null ? r[k] == null : r[k] === v)); return c; };
  c.gte = (k: string, v: unknown) => { filters.push((r) => String(r[k] ?? '') >= String(v)); return c; };
  for (const m of ['not', 'order', 'limit', 'in', 'or', 'neq']) c[m] = () => c;
  c.maybeSingle = () => { single = true; return c; };
  c.insert = (row: Row | Row[]) => { op = 'insert'; payload = row; return c; };
  c.update = (row: Row) => { op = 'update'; payload = row; return c; };
  c.upsert = (row: Row) => { op = 'upsert'; payload = row; return c; };
  c.then = (res: (v: unknown) => unknown) => {
    const matched = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
    if (op === 'insert') {
      const list = Array.isArray(payload) ? payload : [payload as Row];
      tables[table] = [...(tables[table] ?? []), ...list];
      res({ data: null, error: null });
      return;
    }
    if (op === 'upsert') {
      const row = payload as Row;
      const key = typeof row.user_id === 'string' ? 'user_id' : 'id';
      const all = tables[table] ?? [];
      const i = all.findIndex((r) => r[key] === row[key]);
      if (i >= 0) all[i] = { ...all[i], ...row };
      else all.push({ confirmed_at: null, sends_in_window: 0, send_window_started_at: null, created_at: new Date().toISOString(), ...row });
      tables[table] = all;
      res({ data: null, error: null });
      return;
    }
    if (op === 'update') {
      const rows = matched();
      for (const r of rows) Object.assign(r, payload);
      res({ data: rows, error: null });
      return;
    }
    const rows = matched();
    res({ data: single ? rows[0] ?? null : rows, error: null });
  };
  return c;
}

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => chain(t) }) }));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'child-1', email: 'kid@example.com' } } }) } }),
  getCurrentUser: async () => ({ id: 'child-1', email: 'kid@example.com' }),
}));
jest.mock('@/lib/email/resend', () => ({ sendEmail: jest.fn(async () => true) }));
jest.mock('@/lib/xi/client', () => ({ xiCreateUser: jest.fn(async () => null) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { sendEmail } from '@/lib/email/resend';
import { confirmGuardianConsent, GUARDIAN_SENDS_PER_HOUR, requestGuardianConsent } from '@/lib/community/guardian-consent';
import { completeSignup } from '@/app/auth/signup/actions';
import { saveDateOfBirth } from '@/lib/actions/date-of-birth';
import { resendGuardianConsent } from '@/lib/actions/guardian-consent';
import { ensureProfileAndRoles } from '@/lib/auth/onboarding';
import { GET, POST } from '@/app/api/account/guardian-consent/route';
import Page from '@/app/account/guardian-consent/page';

const emailed = sendEmail as jest.Mock;
const consent = () => (tables.guardian_consents ?? [])[0];
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

function issue(token: string, issuedAt: string, over: Row = {}) {
  tables.guardian_consents = [{
    user_id: 'child-1', guardian_email: 'parent@example.com', token_hash: hash(token),
    token_issued_at: issuedAt, created_at: issuedAt, confirmed_at: null, sends_in_window: 1,
    send_window_started_at: issuedAt, ...over,
  }];
}

const post = (token: string) => {
  const body = new URLSearchParams({ token });
  return POST(new NextRequest('http://localhost/api/account/guardian-consent', {
    method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' },
  }));
};

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  emailed.mockReset();
  emailed.mockResolvedValue(true);
});

describe('sign-up of an under-13', () => {
  const signup = (guardianEmail?: string, dateOfBirth = '2015-01-01') => completeSignup({
    userId: 'child-1', fullName: 'Kit Young', email: 'kid@example.com', roles: ['player'], dateOfBirth, guardianEmail,
  });

  it('creates a consent row and emails the guardian a link to the confirm page', async () => {
    const result = await signup('Parent@Example.com');
    expect(result).toEqual({ success: true });
    const token = String((emailed.mock.calls[0][0] as { text: string }).text).match(/token=([a-f0-9]{64})/)?.[1];
    expect(token).toBeTruthy();
    expect(emailed.mock.calls[0][0]).toMatchObject({ to: 'parent@example.com' });
    expect((emailed.mock.calls[0][0] as { text: string }).text).toContain(`/account/guardian-consent?token=${token}`);
    expect((emailed.mock.calls[0][0] as { text: string }).text).not.toContain('/api/account/guardian-consent');
    expect(consent()).toMatchObject({ user_id: 'child-1', guardian_email: 'parent@example.com', token_hash: hash(token!), confirmed_at: null, sends_in_window: 1 });
    expect(tables.profiles?.[0]).toMatchObject({ date_of_birth: '2015-01-01' });
  });

  it('refuses an under-13 with no guardian email and stores nothing', async () => {
    const result = await signup('not-an-email');
    expect(result).toEqual({ success: false, error: 'Under 13s need a parent or guardian email address.' });
    expect(emailed).not.toHaveBeenCalled();
    expect(tables.profiles).toBeUndefined();
    expect(tables.guardian_consents).toBeUndefined();
  });

  it('does not email a guardian for an adult', async () => {
    expect((await signup(undefined, '1990-01-01')).success).toBe(true);
    expect(emailed).not.toHaveBeenCalled();
    expect(tables.guardian_consents).toBeUndefined();
  });

  it('returns an error when the email fails, and a later send still works', async () => {
    emailed.mockResolvedValueOnce(false);
    const failed = await signup('parent@example.com');
    expect(failed).toEqual({ success: false, error: 'The confirmation email could not be sent. Try again in a moment.' });
    expect(consent()?.sends_in_window ?? 0).toBe(0);
    emailed.mockResolvedValue(true);
    expect((await requestGuardianConsent('child-1', 'parent@example.com')).success).toBe(true);
    expect(emailed).toHaveBeenCalledTimes(2);
  });
});

describe('the confirmation email after email confirmation', () => {
  it('sends once from the sign-up metadata when no consent row exists yet', async () => {
    const user = { id: 'child-1', email: 'kid@example.com', app_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z', user_metadata: { full_name: 'Kit Young', roles: ['player'], date_of_birth: '2015-06-01', guardian_email: 'parent@example.com' } } as User;
    await ensureProfileAndRoles(user);
    expect(emailed).toHaveBeenCalledTimes(1);
    expect(consent()?.guardian_email).toBe('parent@example.com');
    await ensureProfileAndRoles(user);
    expect(emailed).toHaveBeenCalledTimes(1);
  });
});

describe('saving a date of birth', () => {
  beforeEach(() => { tables.profiles = [{ id: 'child-1', date_of_birth: null }]; });

  it('emails the guardian when an under-13 saves a date of birth', async () => {
    expect((await saveDateOfBirth('2015-01-01', 'parent@example.com')).success).toBe(true);
    expect(consent()?.token_hash).toEqual(expect.any(String));
    expect(emailed).toHaveBeenCalledTimes(1);
    expect((emailed.mock.calls[0][0] as { text: string }).text).toContain('/account/guardian-consent?token=');
  });

  it('does not save the date when the guardian email is missing', async () => {
    const result = await saveDateOfBirth('2015-01-01', '');
    expect(result.success).toBe(false);
    expect(tables.profiles?.[0].date_of_birth).toBeNull();
    expect(emailed).not.toHaveBeenCalled();
  });
});

describe('resend', () => {
  beforeEach(() => { tables.profiles = [{ id: 'child-1', date_of_birth: '2015-01-01' }]; });

  it('sends again, then stops at about 3 an hour', async () => {
    for (let i = 0; i < GUARDIAN_SENDS_PER_HOUR; i++) expect((await resendGuardianConsent('parent@example.com')).success).toBe(true);
    const blocked = await resendGuardianConsent('parent@example.com');
    expect(blocked).toEqual({ success: false, error: 'A confirmation email was sent recently. Please wait about an hour before sending another.' });
    expect(emailed).toHaveBeenCalledTimes(GUARDIAN_SENDS_PER_HOUR);
  });

  it('does not send for an under-13 who already has a verified parent', async () => {
    tables.child_profiles = [{ linked_user_id: 'child-1' }];
    const result = await resendGuardianConsent('parent@example.com');
    expect(result).toEqual({ success: false, error: 'This account does not need a guardian confirmation.' });
    expect(emailed).not.toHaveBeenCalled();
  });

  it('keeps the previous link when a resend fails to send', async () => {
    expect((await resendGuardianConsent('parent@example.com')).success).toBe(true);
    const previous = consent().token_hash;
    emailed.mockResolvedValueOnce(false);
    expect((await resendGuardianConsent('other@example.com')).success).toBe(false);
    expect(consent()).toMatchObject({ token_hash: previous, guardian_email: 'parent@example.com', sends_in_window: 1 });
  });
});

describe('confirming the link', () => {
  const token = 'ab'.repeat(32);

  it('confirms on POST and refuses the same token afterwards', async () => {
    issue(token, new Date().toISOString());
    const res = await post(token);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('done=1');
    expect(res.headers.get('location')).not.toContain('token=');
    expect(consent().confirmed_at).toEqual(expect.any(String));
    expect(consent().token_hash).toBeNull();
    const again = await post(token);
    expect(again.headers.get('location')).toContain('error=used');
  });

  it('does not confirm when the link is only opened', async () => {
    issue(token, new Date().toISOString());
    const res = await GET(new NextRequest(`http://localhost/api/account/guardian-consent?token=${token}`));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('location')).toContain(`/account/guardian-consent?token=${token}`);
    expect(consent().confirmed_at).toBeNull();
    await Page({ searchParams: Promise.resolve({ token }) });
    expect(consent().confirmed_at).toBeNull();
    expect(consent().token_hash).toBe(hash(token));
  });

  it('rejects a token older than 7 days and accepts one younger', async () => {
    issue(token, daysAgo(8));
    const old = await post(token);
    expect(old.headers.get('location')).toContain('error=used');
    expect(consent().confirmed_at).toBeNull();
    expect(consent().token_hash).toBe(hash(token));

    const legacy = 'cd'.repeat(32);
    issue(legacy, daysAgo(8), { token_issued_at: null });
    expect((await post(legacy)).headers.get('location')).toContain('error=used');
    expect(consent().confirmed_at).toBeNull();

    const fresh = 'ef'.repeat(32);
    issue(fresh, daysAgo(6));
    expect((await post(fresh)).headers.get('location')).toContain('done=1');
    expect(consent().confirmed_at).toEqual(expect.any(String));
  });

  it('rejects a token that is not the right shape', async () => {
    issue(token, new Date().toISOString());
    const res = await post('not-a-token');
    expect(res.headers.get('location')).toContain('error=invalid');
    expect(consent().confirmed_at).toBeNull();
    expect((await confirmGuardianConsent('')).success).toBe(false);
  });
});
