// A club admin confirms a junior's date of birth. Only an admin of a club the junior belongs to can, only for a junior,
// only for the date they were shown, and never their own.
import fs from 'fs';
import path from 'path';
import { statedb, statedbClient } from './helpers/statedb';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => statedbClient() }));
const requireUser = jest.fn(); const getAdminContext = jest.fn();
jest.mock('@/lib/auth/server', () => ({ requireUser: () => requireUser() }));
jest.mock('@/lib/auth/admin', () => ({ getAdminContext: (id: string) => getAdminContext(id) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { confirmDob, listDobToConfirm } from '@/lib/admin/dob-confirmation';
import { confirmDobAction } from '@/lib/actions/dob-confirmation';

const m = (user_id: string, club_id: string, over: Record<string, unknown> = {}) => ({ user_id, club_id, role: 'player', is_junior: false, is_active: true, ...over });
const p = (id: string, name: string, dob: string | null, over: Record<string, unknown> = {}) => ({ id, full_name: name, display_name: null, date_of_birth: dob, dob_confirmed_by: null, dob_confirmed_at: null, ...over });
const profile = (id: string) => statedb.tables.profiles.find((r) => r.id === id)!;

beforeEach(() => {
  statedb.failOn = null;
  statedb.reset({
    club_members: [
      m('boss', 'c1', { role: 'club_admin' }), m('boss2', 'c2', { role: 'club_admin' }), m('coach', 'c1', { role: 'coach' }), m('lapsed', 'c1', { role: 'club_admin', is_active: false }),
      m('jadmin', 'c1', { role: 'club_admin', is_junior: true }), m('kid', 'c1', { is_junior: true }), m('teen', 'c1'), m('done', 'c1', { is_junior: true }), m('far', 'c2', { is_junior: true }), m('adult', 'c1'), m('nodob', 'c1', { is_junior: true }), m('both', 'c1', { is_junior: true }), m('both', 'c2', { is_junior: true }),
    ],
    profiles: [
      p('boss', 'Bea Boss', '1980-01-01'), p('boss2', 'Other Boss', '1980-01-01'), p('coach', 'Cal Coach', '1990-01-01'), p('lapsed', 'Old Admin', '1980-01-01'),
      p('jadmin', 'Young Admin', '2008-08-08'), p('kid', 'Kit Young', '2012-06-01'), p('teen', 'Tee Teen', '2010-03-04'), p('done', 'Dee Done', '2011-01-01', { dob_confirmed_by: 'boss', dob_confirmed_at: '2026-01-01T00:00:00Z' }),
      p('far', 'Far Away', '2012-01-01'), p('adult', 'Ann Adult', '1985-05-05'), p('nodob', 'No Date', null), p('both', 'Both Clubs', '2013-02-02'),
    ],
  });
  requireUser.mockResolvedValue({ id: 'boss' }); getAdminContext.mockResolvedValue({ adminClubIds: ['c1'] });
});

describe('confirming a date of birth', () => {
  it('records who and when, for the date the admin was shown', async () => {
    const r = await confirmDob('boss', ['c1'], 'kid', '2012-06-01');
    expect(r).toEqual({ success: true, name: 'Kit Young' });
    expect(profile('kid')).toMatchObject({ dob_confirmed_by: 'boss', dob_confirmed_at: expect.any(String) });
  });
  it('works for a junior by date of birth alone, not only one the club has marked', async () => {
    expect((await confirmDob('boss', ['c1'], 'teen', '2010-03-04')).success).toBe(true);
  });
  it('works for a junior who belongs to a second club the admin is not in, as long as one club is shared', async () => {
    expect((await confirmDob('boss', ['c1'], 'both', '2013-02-02')).success).toBe(true);
  });
  it.each([
    ['an admin of a different club', () => confirmDob('boss2', ['c2'], 'kid', '2012-06-01')],
    ['a coach, who is not a club admin', () => confirmDob('coach', ['c1'], 'kid', '2012-06-01')],
    ['an admin whose membership has lapsed', () => confirmDob('lapsed', ['c1'], 'kid', '2012-06-01')],
    ['someone who passes club ids they are not admin of', () => confirmDob('coach', ['c1', 'c2'], 'kid', '2012-06-01')],
    ['nobody with any admin club', () => confirmDob('boss', [], 'kid', '2012-06-01')],
    ['an admin confirming their own date', () => confirmDob('boss', ['c1'], 'boss', '1980-01-01')],
    ['a junior who is also a club admin confirming their own date', () => confirmDob('jadmin', ['c1'], 'jadmin', '2008-08-08')],
    ['an adult member', () => confirmDob('boss', ['c1'], 'adult', '1985-05-05')],
    ['a member with no date of birth', () => confirmDob('boss', ['c1'], 'nodob', '2012-01-01')],
    ['a date that has changed since it was shown', () => confirmDob('boss', ['c1'], 'kid', '2011-06-01')],
    ['a member of a club the admin is not in', () => confirmDob('boss', ['c1'], 'far', '2012-01-01')],
    ['a user id that does not exist', () => confirmDob('boss', ['c1'], 'ghost', '2012-01-01')],
    ['a junior id that is not a string', () => confirmDob('boss', ['c1'], { id: 'kid' }, '2012-06-01')],
  ])('is refused for %s and changes nothing', async (_n, go) => {
    const before = JSON.stringify(statedb.tables.profiles);
    const r = await go();
    expect(r.success).toBe(false);
    expect(JSON.stringify(statedb.tables.profiles)).toBe(before);
  });
});

describe('the server action', () => {
  it('uses the signed-in admin and their clubs, never ones supplied by the caller', async () => {
    const r = await confirmDobAction('kid', '2012-06-01');
    expect(r).toMatchObject({ success: true });
    expect(profile('kid').dob_confirmed_by).toBe('boss');
    requireUser.mockResolvedValue({ id: 'coach' }); getAdminContext.mockResolvedValue({ adminClubIds: [] });
    expect(await confirmDobAction('teen', '2010-03-04')).toMatchObject({ success: false });
    expect(profile('teen').dob_confirmed_by).toBeNull();
  });
});

describe('the list in the club admin area', () => {
  it('shows unconfirmed juniors at the admin’s clubs, youngest first, and counts the confirmed', async () => {
    const r = await listDobToConfirm(['c1']);
    expect(r.items.map((i) => i.userId)).toEqual(['both', 'kid', 'teen', 'jadmin']);
    expect(r.confirmed).toBe(1);
    expect(r.items[0]).toMatchObject({ name: 'Both Clubs', dob: '2013-02-02', age: expect.any(Number) });
  });
  it('leaves out adults, juniors with no date, other clubs’ juniors and the already confirmed', async () => {
    const ids = (await listDobToConfirm(['c1'])).items.map((i) => i.userId);
    for (const gone of ['adult', 'nodob', 'far', 'done', 'boss']) expect(ids).not.toContain(gone);
  });
  it('shows nothing without clubs, and says so if the columns are missing', async () => {
    expect(await listDobToConfirm([])).toEqual({ items: [], confirmed: 0 });
    statedb.failOn = 'profiles';
    expect((await listDobToConfirm(['c1'])).error).toMatch(/not been applied/);
  });
});

describe('who may write the confirmation', () => {
  it('only the admin module assigns dob_confirmed_by, and the migration stops client roles', () => {
    const root = path.join(__dirname, '..');
    const writers: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== '__tests__') walk(f); }
        else if (/\.(ts|tsx)$/.test(e.name) && /dob_confirmed_by:\s/.test(fs.readFileSync(f, 'utf8'))) writers.push(path.relative(root, f));
      }
    };
    walk(root);
    expect(writers).toEqual(['lib/admin/dob-confirmation.ts']);
  });
});

describe('migration 026', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261122000026_dob_confirmation.sql'), 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  it('adds the two columns idempotently', () => {
    expect(code).toContain('ADD COLUMN IF NOT EXISTS dob_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL');
    expect(code).toContain('ADD COLUMN IF NOT EXISTS dob_confirmed_at TIMESTAMPTZ');
  });
  it('guards inserts and updates for client roles, with a pinned search_path and no execute for them', () => {
    expect(code).toContain("current_user IN ('anon', 'authenticated')");
    expect(code).toContain('BEFORE INSERT OR UPDATE ON public.profiles');
    expect(code).toContain("SET search_path TO 'public'");
    expect(code).toContain('REVOKE ALL ON FUNCTION public.profiles_guard_dob_confirmation() FROM PUBLIC, anon, authenticated');
    expect(code).toContain('DROP TRIGGER IF EXISTS profiles_guard_dob_confirmation');
    expect(code).not.toMatch(/SECURITY DEFINER/); // it must see who is calling
  });
  it('clears the confirmation when the date itself changes', () => {
    expect(code).toContain('NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth');
    expect(code).toContain('NEW.dob_confirmed_by := NULL');
  });
});
