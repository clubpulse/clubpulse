// A confirmed account must always end up with a profile, even when the confirmation link is opened in a different
// browser from the sign-up (no PKCE verifier, so /auth/callback never creates it).
const upserts: Record<string, unknown>[] = [];
const roleInserts: Record<string, unknown>[][] = [];
const dobUpdates: Array<{ row: Record<string, unknown>; onlyWhenNull: boolean }> = [];
const state = { dob: null as string | null, profileExists: false, hasRoles: false, profileError: null as null | { message: string }, roleError: null as null | { message: string } };

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          upsert: async (row: Record<string, unknown>) => { upserts.push(row); return { error: state.profileError }; },
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.profileExists ? { id: 'u1', date_of_birth: state.dob } : null }) }) }),
          update: (row: Record<string, unknown>) => ({ eq: () => ({ is: async () => {
            dobUpdates.push({ row, onlyWhenNull: true });
            if (state.dob === null && typeof row.date_of_birth === 'string') { state.dob = row.date_of_birth; state.profileExists = true; }
            return { error: null };
          } }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ limit: async () => ({ data: state.hasRoles ? [{ id: 'r' }] : [] }) }) }),
        insert: async (rows: Record<string, unknown>[]) => { roleInserts.push(rows); return { error: state.roleError }; },
      };
    },
  }),
}));

const verifyOtp = jest.fn();
const exchangeCodeForSession = jest.fn();
const getUser = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession, getUser } }) }));
jest.mock('next/navigation', () => ({ redirect: jest.fn(() => { throw new Error('REDIRECT'); }) }));
jest.mock('next/headers', () => ({ headers: async () => ({ get: () => null }) }));

import type { User } from '@supabase/supabase-js';
import { ensureProfileAndRoles, isMissingVerifier } from '@/lib/auth/onboarding';
import { ensureProfile } from '@/lib/auth/server';
import { GET } from '@/app/auth/callback/route';

const user = (over: Partial<User> = {}) => ({ id: 'u1', email: 'ada@example.com', user_metadata: {}, ...over }) as User;

beforeEach(() => {
  upserts.length = 0; roleInserts.length = 0; dobUpdates.length = 0;
  Object.assign(state, { dob: null, profileExists: false, hasRoles: false, profileError: null, roleError: null });
  verifyOtp.mockReset(); exchangeCodeForSession.mockReset(); getUser.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ensureProfileAndRoles and the date of birth', () => {
  it('sets a plausible sign-up date after creating the profile, only where none is saved', async () => {
    await ensureProfileAndRoles(user({ user_metadata: { date_of_birth: '2010-10-10' } }));
    expect(upserts[0]).not.toHaveProperty('date_of_birth');   // the upsert never carries it, so it cannot overwrite
    expect(dobUpdates).toEqual([{ row: { date_of_birth: '2010-10-10' }, onlyWhenNull: true }]);
  });
  it('sets nothing for an implausible date', async () => {
    await ensureProfileAndRoles(user({ user_metadata: { date_of_birth: '2999-01-01' } }));
    expect(dobUpdates).toHaveLength(0);
  });
});

describe('ensureProfileAndRoles', () => {
  it('uses the name and self-serve roles from sign-up metadata', async () => {
    await ensureProfileAndRoles(user({ user_metadata: { full_name: '  Ada Lovelace ', roles: ['coach', 'player'] } }));
    expect(upserts[0]).toMatchObject({ id: 'u1', full_name: 'Ada Lovelace', display_name: 'Ada', email: 'ada@example.com' });
    expect(roleInserts[0]).toEqual([
      { user_id: 'u1', role: 'coach', is_primary: true },
      { user_id: 'u1', role: 'player', is_primary: false },
    ]);
  });
  it('falls back to the email prefix and the player role', async () => {
    await ensureProfileAndRoles(user());
    expect(upserts[0]).toMatchObject({ full_name: 'ada', display_name: 'ada' });
    expect(roleInserts[0]).toEqual([{ user_id: 'u1', role: 'player', is_primary: true }]);
  });
  it('never self-assigns club_admin or merchant', async () => {
    await ensureProfileAndRoles(user({ user_metadata: { roles: ['club_admin', 'merchant', 'parent'] } }));
    expect(roleInserts[0].map((r) => r.role)).toEqual(['parent']);
  });
  it('leaves existing roles alone, so running it again changes nothing', async () => {
    state.hasRoles = true;
    await ensureProfileAndRoles(user({ user_metadata: { roles: ['coach'] } }));
    expect(roleInserts).toHaveLength(0);
  });
  it('reports a failed profile or role insert instead of ignoring it', async () => {
    state.profileError = { message: 'boom' };
    await expect(ensureProfileAndRoles(user())).rejects.toThrow(/profile.*boom/);
    state.profileError = null; state.roleError = { message: 'nope' };
    await expect(ensureProfileAndRoles(user())).rejects.toThrow(/roles.*nope/);
  });
});

describe('ensureProfile (the sign-in safety net)', () => {
  it('does nothing when the profile exists', async () => {
    state.profileExists = true;
    await ensureProfile(user());
    expect(upserts).toHaveLength(0);
  });
  it('creates the profile when it is missing', async () => {
    await ensureProfile(user({ id: 'u2' }));
    expect(upserts[0]).toMatchObject({ id: 'u2' });
  });
  it('logs a failure and lets the page load', async () => {
    state.profileError = { message: 'boom' };
    await expect(ensureProfile(user({ id: 'u3' }))).resolves.toEqual({ needsDob: false });
  });
  it('does nothing more when the profile and its date of birth are both there', async () => {
    state.profileExists = true; state.dob = '1990-05-05';
    await expect(ensureProfile(user({ user_metadata: { date_of_birth: '2012-01-01' } }))).resolves.toEqual({ needsDob: false });
    expect(upserts).toHaveLength(0);
    expect(dobUpdates).toHaveLength(0);   // an existing date is never overwritten
  });
  it('backfills the date of birth from sign-up data when the profile exists without one (password sign-in after a missed callback)', async () => {
    state.profileExists = true;
    await expect(ensureProfile(user({ user_metadata: { date_of_birth: '2012-03-01' } }))).resolves.toEqual({ needsDob: false });
    expect(dobUpdates).toEqual([{ row: { date_of_birth: '2012-03-01' }, onlyWhenNull: true }]);
    expect(upserts).toHaveLength(0);
  });
  it('asks for the date of birth when there is none on file and none in the sign-up data', async () => {
    state.profileExists = true;
    await expect(ensureProfile(user())).resolves.toEqual({ needsDob: true });
    expect(dobUpdates).toHaveLength(0);
  });
  it('ignores an implausible date in the sign-up data and still asks', async () => {
    for (const bad of ['not a date', '2999-01-01', '1800-01-01', '2026-02-30', 20120301, null]) {
      dobUpdates.length = 0; state.dob = null; state.profileExists = true;
      await expect(ensureProfile(user({ id: `bad-${String(bad)}`, user_metadata: { date_of_birth: bad } }))).resolves.toEqual({ needsDob: true });
      expect(dobUpdates).toHaveLength(0);
    }
  });
  it('creates a missing profile and fills the date of birth from sign-up data in the same pass', async () => {
    await expect(ensureProfile(user({ id: 'u9', user_metadata: { date_of_birth: '2011-06-06' } }))).resolves.toEqual({ needsDob: false });
    expect(upserts[0]).toMatchObject({ id: 'u9' });
    expect(dobUpdates[0].row).toEqual({ date_of_birth: '2011-06-06' });
  });
});

describe('/auth/callback', () => {
  const call = (qs: string) => GET(new Request(`https://shiftup.club/auth/callback?${qs}`));
  it('recognises the missing-verifier error', () => {
    expect(isMissingVerifier('PKCE code verifier not found in storage')).toBe(true);
    expect(isMissingVerifier('code verifier not found in storage')).toBe(true);
    expect(isMissingVerifier('Email link is invalid or has expired')).toBe(false);
  });
  it('sends a different-browser confirmation to a calm sign-in page, not an error', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser.' } });
    const res = await call('code=abc');
    expect(res.headers.get('location')).toBe('https://shiftup.club/auth/sign-in?confirmed=1');
  });
  it('still reports a genuinely bad link as an error', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'Email link is invalid or has expired' } });
    const res = await call('token_hash=x&type=signup');
    expect(res.headers.get('location')).toContain('error=auth-code-error');
  });
  it('confirms with token_hash (works in any browser) and creates the profile', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: user({ user_metadata: { full_name: 'Ada Lovelace' } }) } });
    const res = await call('token_hash=x&type=signup&next=/dashboard');
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'x' });
    expect(upserts[0]).toMatchObject({ full_name: 'Ada Lovelace' });
    expect(res.headers.get('location')).toBe('https://shiftup.club/dashboard');
  });
  it('still signs the person in if creating the profile fails', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: user() } });
    state.profileError = { message: 'boom' };
    const res = await call('token_hash=x&type=signup');
    expect(res.headers.get('location')).not.toContain('error=');
  });
});
