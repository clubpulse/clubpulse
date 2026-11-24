// DOB_CONFIRMATION_REQUIRED: once exactly "true", a junior needs a club-confirmed date of birth before any junior feature.
import { memdb, client } from './helpers/memdb';
import { ageStatus, HOLD_NEEDS_DOB_CONFIRMATION, HOLD_PENDING_PARENT } from '@/lib/community/age';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => client() }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: async () => ({ status: 'live' }) }));
jest.mock('@/lib/scores/context', () => ({ awardScores: async () => ({ ok: true }) }));
(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({ ok: true });

import { getViewer, people, dobConfirmationRequired, dobColumns, getFeed } from '@/lib/community/service';
import { createAdminClient } from '@/lib/supabase/admin';

const admin = () => createAdminClient() as never;
const confirmed = { dob_confirmed_by: 'boss', dob_confirmed_at: '2026-01-01T00:00:00Z' };
const member = (user_id: string, over: Record<string, unknown> = {}) => ({ user_id, club_id: 'c1', role: 'player', is_junior: false, is_active: true, joined_at: '2024-01-01', ...over });
const prof = (id: string, dob: string, over: Record<string, unknown> = {}) => ({ id, full_name: id, display_name: null, date_of_birth: dob, push_token: null, ...over });

beforeEach(() => {
  process.env.COMMUNITY_ENABLED = 'true'; process.env.COMMUNITY_JUNIORS_ENABLED = 'true'; delete process.env.DOB_CONFIRMATION_REQUIRED;
  memdb.reset({
    clubs: [{ id: 'c1', name: 'Fairwick CC', county: null, league: null, ground_lat: null, ground_lng: null }],
    club_members: [member('kid', { is_junior: true }), member('kid2', { is_junior: true }), member('teen'), member('dan')],
    profiles: [prof('kid', '2012-06-01'), prof('kid2', '2012-07-01', confirmed), prof('teen', '2010-01-01'), prof('dan', '1985-01-01')],
    child_profiles: ['kid', 'kid2', 'teen'].map((u) => ({ linked_user_id: u, parent_child_links: [{ parent_id: `p-${u}`, verified_at: '2026-01-01' }] })),
    community_blocks: [], community_posts: [], community_connections: [],
  });
});
afterAll(() => { delete process.env.COMMUNITY_JUNIORS_ENABLED; delete process.env.DOB_CONFIRMATION_REQUIRED; });

describe('the pure rule', () => {
  const base = { clubJunior: true, dob: '2012-06-01', hasVerifiedParent: true };
  it('is off unless asked for', () => {
    expect(ageStatus(base)).toMatchObject({ status: 'junior', cleared: true });
    expect(ageStatus({ ...base, requireDobConfirmation: false })).toMatchObject({ status: 'junior', cleared: true });
  });
  it('holds an unconfirmed junior when required, and opens a confirmed one', () => {
    expect(ageStatus({ ...base, requireDobConfirmation: true })).toEqual({ status: 'needs_dob_confirmation', junior: true, cleared: false, hold: HOLD_NEEDS_DOB_CONFIRMATION });
    expect(ageStatus({ ...base, requireDobConfirmation: true, dobConfirmed: true })).toMatchObject({ status: 'junior', cleared: true });
  });
  it('does not count a confirmation with no date of birth', () => {
    expect(ageStatus({ clubJunior: true, dob: null, hasVerifiedParent: true, requireDobConfirmation: true, dobConfirmed: true })).toMatchObject({ cleared: false });
  });
  it('never affects adults, and keeps the parent rule first', () => {
    expect(ageStatus({ clubJunior: false, dob: '1985-01-01', hasVerifiedParent: false, requireDobConfirmation: true })).toMatchObject({ status: 'adult', cleared: true });
    expect(ageStatus({ ...base, hasVerifiedParent: false, requireDobConfirmation: true })).toMatchObject({ status: 'pending_parent', hold: HOLD_PENDING_PARENT });
  });
});

describe('the switch', () => {
  it.each([[undefined], [''], ['TRUE'], ['1'], ['yes'], ['true ']])('is off for %p', (v) => {
    if (v === undefined) delete process.env.DOB_CONFIRMATION_REQUIRED; else process.env.DOB_CONFIRMATION_REQUIRED = v;
    expect(dobConfirmationRequired()).toBe(false);
    expect(dobColumns()).toBe('date_of_birth'); // does not need migration 026 until it is on
  });
  it('is on only for exactly "true", and then asks for the confirmation columns', () => {
    process.env.DOB_CONFIRMATION_REQUIRED = 'true';
    expect(dobConfirmationRequired()).toBe(true);
    expect(dobColumns()).toBe('date_of_birth, dob_confirmed_by, dob_confirmed_at');
  });
});

describe('juniors in the Community', () => {
  it('are unaffected while it is off', async () => {
    expect((await getViewer(admin(), 'kid')).hold).toBeNull();
    expect((await getFeed('kid', 'club')).success).toBe(true);
  });
  it('need a confirmed date once it is on: refused, with no clubs, and hidden from others', async () => {
    process.env.DOB_CONFIRMATION_REQUIRED = 'true';
    expect(await getViewer(admin(), 'kid')).toMatchObject({ hold: HOLD_NEEDS_DOB_CONFIRMATION, clubIds: [], status: 'needs_dob_confirmation' });
    expect(await getFeed('kid', 'club')).toEqual({ success: false, error: HOLD_NEEDS_DOB_CONFIRMATION });
    expect((await people(admin(), ['kid'])).get('kid')).toMatchObject({ junior: true, cleared: false });
  });
  it('are let in once a club admin has confirmed, and adults never need it', async () => {
    process.env.DOB_CONFIRMATION_REQUIRED = 'true';
    expect((await getViewer(admin(), 'kid2')).hold).toBeNull();
    expect((await getFeed('kid2', 'club')).success).toBe(true);
    expect((await people(admin(), ['kid2'])).get('kid2')?.cleared).toBe(true);
    expect((await getViewer(admin(), 'dan')).hold).toBeNull();
    expect((await getFeed('dan', 'club')).success).toBe(true);
  });
  it('covers a junior known only by date of birth, not marked by the club', async () => {
    process.env.DOB_CONFIRMATION_REQUIRED = 'true';
    expect((await getViewer(admin(), 'teen')).hold).toBe(HOLD_NEEDS_DOB_CONFIRMATION);
  });
  it('a confirmation with one missing half is not a confirmation', async () => {
    process.env.DOB_CONFIRMATION_REQUIRED = 'true';
    memdb.tables.profiles = memdb.tables.profiles.map((r) => (r.id === 'kid2' ? { ...r, dob_confirmed_by: null } : r));
    expect((await getViewer(admin(), 'kid2')).hold).toBe(HOLD_NEEDS_DOB_CONFIRMATION);
  });
});
