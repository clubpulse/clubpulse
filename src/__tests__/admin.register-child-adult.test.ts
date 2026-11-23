// Only an adult can register a child as their parent. The link starts unverified whoever registers.
import { memdb, client } from './helpers/memdb';

jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => client() }));

import { registerChild } from '@/lib/admin/parent-service';
import { registerJunior, type RegisterJuniorInput } from '@/lib/mobile/club-data';

const ADULT = { id: 'mum', date_of_birth: '1985-04-12' };
const JUNIOR_INPUT: RegisterJuniorInput = { first_name: 'Kit', last_name: 'Young', date_of_birth: '2014-03-01', gender: null, relationship: 'parent', emergency_contact_name: null, emergency_contact_phone: null, medical_notes: null, consents: [], club_id: null };
const CHILD = { first_name: 'Kit', last_name: 'Young', date_of_birth: '2014-03-01' };
const world = (profile: Record<string, unknown> | null, members = [{ is_junior: false }]) => memdb.reset({
  profiles: profile ? [profile] : [],
  club_members: members.map((m) => ({ user_id: 'mum', club_id: 'c1', role: 'member', joined_at: '2024-01-01', is_active: true, ...m })),
  parent_child_links: [],
});
const linkInserts = () => memdb.writes.filter((w) => w.table === 'parent_child_links' && w.op === 'insert');
const childInserts = () => memdb.writes.filter((w) => w.table === 'child_profiles' && w.op === 'insert');

const refused: Array<[string, Record<string, unknown> | null, Array<{ is_junior: boolean }>]> = [
  ['no date of birth', { id: 'mum', date_of_birth: null }, [{ is_junior: false }]],
  ['no profile', null, [{ is_junior: false }]],
  ['an under-18 date of birth', { id: 'mum', date_of_birth: '2011-02-01' }, [{ is_junior: false }]],
  ['an adult date of birth but marked a junior by the club', ADULT, [{ is_junior: true }]],
];

describe.each([
  ['registerChild (web)', (parent: string) => registerChild('c1', parent, { ...CHILD })],
  ['registerJunior (mobile)', (parent: string) => registerJunior(parent, { ...JUNIOR_INPUT }, {})],
])('%s', (_name, run) => {
  it.each(refused)('is refused for an account with %s, and writes nothing', async (_n, profile, members) => {
    world(profile, members);
    const r = await run('mum');
    expect(r.success).toBe(false);
    expect(childInserts()).toHaveLength(0);
    expect(linkInserts()).toHaveLength(0);
  });
  it('registers the child for a qualifying adult, with the link unverified', async () => {
    world(ADULT);
    const r = await run('mum');
    expect(r.success).toBe(true);
    expect(childInserts()).toHaveLength(1);
    expect(linkInserts()).toHaveLength(1);
    const row = linkInserts()[0].row as Record<string, unknown>;
    expect(row).toMatchObject({ parent_id: 'mum' });
    expect(row.verified_at).toBeUndefined();
    expect(row.verified_by).toBeUndefined();
  });
});
