// A confirmed account must always end up with a profile, even when the confirmation link is opened in a different
// browser from the sign-up (no PKCE verifier, so /auth/callback never creates it).
const upserts: Record<string, unknown>[] = [];
const roleInserts: Record<string, unknown>[][] = [];
const state = { profileExists: false, hasRoles: false, profileError: null as null | { message: string }, roleError: null as null | { message: string } };

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          upsert: async (row: Record<string, unknown>) => { upserts.push(row); return { error: state.profileError }; },
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.profileExists ? { id: 'u1' } : null }) }) }),
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
  upserts.length = 0; roleInserts.length = 0;
  Object.assign(state, { profileExists: false, hasRoles: false, profileError: null, roleError: null });
  verifyOtp.mockReset(); exchangeCodeForSession.mockReset(); getUser.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
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
    await expect(ensureProfile(user({ id: 'u3' }))).resolves.toBeUndefined();
  });
});

describe('/auth/callback', () => {
  const call = (qs: string) => GET(new Request(`https://shift.club/auth/callback?${qs}`));
  it('recognises the missing-verifier error', () => {
    expect(isMissingVerifier('PKCE code verifier not found in storage')).toBe(true);
    expect(isMissingVerifier('code verifier not found in storage')).toBe(true);
    expect(isMissingVerifier('Email link is invalid or has expired')).toBe(false);
  });
  it('sends a different-browser confirmation to a calm sign-in page, not an error', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser.' } });
    const res = await call('code=abc');
    expect(res.headers.get('location')).toBe('https://shift.club/auth/sign-in?confirmed=1');
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
    expect(res.headers.get('location')).toBe('https://shift.club/dashboard');
  });
  it('still signs the person in if creating the profile fails', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: user() } });
    state.profileError = { message: 'boom' };
    const res = await call('token_hash=x&type=signup');
    expect(res.headers.get('location')).not.toContain('error=');
  });
});
