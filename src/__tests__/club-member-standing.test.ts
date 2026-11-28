// Role and junior status change in ONE place. These tests prove each old path is now refused or rerouted,
// that clearing junior status needs a confirmed adult date of birth, and that the checked path writes the audit row.
import fs from 'fs';
import path from 'path';
import { statedb, statedbClient } from './helpers/statedb';

type Rpc = { name: string; args: Record<string, unknown> };
const rpcCalls: Rpc[] = [];
const auditLog: Array<Record<string, unknown>> = [];
let rpcFails = false;

// A stand-in for the admin client. Direct writes to role or is_junior THROW, which is what the
// database trigger does to anything that is not the checked function. The rpc stand-in applies the
// change and writes the audit row the way the SQL function does (its own checks are in view-rls.sql).
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    const base = statedbClient();
    const guarded = (table: string) => {
      const q = base.from(table);
      // statedb has no ilike or delete; these two are what the code under test needs
      q.ilike = (k: string, v: string) => q.in(k, (statedb.tables[table] ?? []).map((r) => r[k]).filter((x) => String(x).toLowerCase() === String(v).toLowerCase()));
      q.delete = () => ({ eq: async (k: string, v: unknown) => { statedb.tables[table] = (statedb.tables[table] ?? []).filter((r) => r[k] !== v); return { error: null }; } });
      if (table !== 'club_members') return q;
      const bad = (p: unknown) => (Array.isArray(p) ? p : [p]).some((r) => r && typeof r === 'object' && ('role' in r || 'is_junior' in r));
      const update = q.update; const insert = q.insert;
      q.update = (p: unknown) => { if (bad(p)) throw new Error('DIRECT WRITE to role/is_junior'); return update(p); };
      q.insert = (p: unknown) => { if (bad(p)) throw new Error('DIRECT WRITE to role/is_junior'); return insert(p); };
      return q;
    };
    return {
      ...base,
      from: guarded,
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        if (rpcFails) return { data: null, error: { message: 'boom' } };
        const rows = statedb.tables.club_members;
        if (name === 'set_club_member_standing') {
          const r = rows.find((x) => x.id === args.p_member)!;
          auditLog.push({ member_id: r.id, previous_role: r.role, new_role: args.p_role, previous_junior: r.is_junior, new_junior: args.p_junior,
            changed_by: args.p_actor, reason: args.p_reason, source: args.p_source, created_at: 'now' });
          Object.assign(r, { role: args.p_role, is_junior: args.p_junior });
        } else if (name === 'add_club_member') {
          const id = `m-${rows.length + 1}`;
          rows.push({ id, club_id: args.p_club, user_id: args.p_user, role: args.p_role, is_junior: false, is_active: true });
          auditLog.push({ member_id: id, previous_role: null, new_role: args.p_role, changed_by: args.p_actor, reason: args.p_reason, source: args.p_source });
        }
        return { data: null, error: null };
      },
    };
  },
}));
const requireUser = jest.fn();
jest.mock('@/lib/auth/server', () => ({ requireUser: () => requireUser() }));
jest.mock('@/lib/auth/admin', () => ({
  isClubAdmin: async (u: string, c: string) => statedb.tables.club_members.some((m) => m.user_id === u && m.club_id === c && m.role === 'club_admin' && m.is_active),
  isPlatformAdmin: async () => false,
  requireAdmin: async () => ({ id: 'staff' }),
  getAdminContext: async () => ({ adminClubIds: ['c1'] }),
}));
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));

import { setClubMemberStanding } from '@/lib/actions/club-member-standing';
import { setMemberJunior } from '@/lib/actions/scores-engine';
import { updateClubMember } from '@/lib/admin/service';
import { removeClubAdmin } from '@/app/(platform-admin)/admin/clubs/actions';
import { linkChildToAccount } from '@/lib/admin/child-link';
import { decideJoinRequest } from '@/lib/mobile/club-admin';

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = UUID(1), KID = UUID(2), COACH = UUID(3), OUTSIDER = UUID(4), CLUB = UUID(9);
const M = { admin: UUID(11), kid: UUID(12), coach: UUID(13) };
const years = (n: number) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - n); return d.toISOString().slice(0, 10); };
const member = (id: string) => statedb.tables.club_members.find((m) => m.id === id)!;

function world(profile: Record<string, unknown> | null) {
  rpcCalls.length = 0; auditLog.length = 0; rpcFails = false;
  statedb.reset({
    club_members: [
      { id: M.admin, club_id: CLUB, user_id: ADMIN, role: 'club_admin', is_junior: false, is_active: true },
      { id: M.kid, club_id: CLUB, user_id: KID, role: 'player', is_junior: true, is_active: true },
      { id: M.coach, club_id: CLUB, user_id: COACH, role: 'coach', is_junior: false, is_active: true },
    ],
    profiles: [
      { id: ADMIN, date_of_birth: '1980-01-01', dob_confirmed_by: null },
      ...(profile ? [{ id: KID, ...profile }] : []),
    ],
    clubs: [{ id: CLUB }],
    club_join_requests: [{ id: UUID(50), club_id: CLUB, user_id: OUTSIDER }],
    child_profiles: [{ id: 'k1', club_id: CLUB, first_name: 'Kit', date_of_birth: years(10), linked_user_id: null }],
  });
  requireUser.mockResolvedValue({ id: ADMIN });
}
const adult = { date_of_birth: years(25), dob_confirmed_by: ADMIN, dob_confirmed_at: '2026-01-01' };

describe('clearing junior status (the Scores rules switch)', () => {
  it('is refused with no date of birth, and nothing is written', async () => {
    world(null);
    const r = await setMemberJunior(CLUB, KID, false);
    expect(r.success).toBe(false);
    expect(member(M.kid).is_junior).toBe(true);
    expect(rpcCalls).toHaveLength(0);
  });
  it('is refused when the date of birth has not been confirmed', async () => {
    world({ date_of_birth: years(25), dob_confirmed_by: null });
    expect((await setMemberJunior(CLUB, KID, false)).success).toBe(false);
    expect(member(M.kid).is_junior).toBe(true);
  });
  it('is refused when the confirmed date of birth is under 18', async () => {
    world({ date_of_birth: years(15), dob_confirmed_by: ADMIN });
    const r = await setMemberJunior(CLUB, KID, false);
    expect(r).toMatchObject({ success: false });
    expect(member(M.kid).is_junior).toBe(true);
    expect(rpcCalls).toHaveLength(0);
  });
  it('is refused for a member clearing their own, even if they are an admin', async () => {
    world(adult);
    statedb.tables.club_members.find((m) => m.id === M.kid)!.role = 'club_admin';
    requireUser.mockResolvedValue({ id: KID });
    expect((await setMemberJunior(CLUB, KID, false)).success).toBe(false);
    expect(member(M.kid).is_junior).toBe(true);
  });
  it('is refused for someone who is not an admin of that club', async () => {
    world(adult);
    requireUser.mockResolvedValue({ id: COACH });
    expect((await setMemberJunior(CLUB, KID, false)).success).toBe(false);
    expect(member(M.kid).is_junior).toBe(true);
  });
  it('works with a confirmed adult date of birth, through the checked function, and writes the audit row', async () => {
    world(adult);
    const r = await setMemberJunior(CLUB, KID, false, 'Turned 18, date of birth checked');
    expect(r.success).toBe(true);
    expect(rpcCalls.map((c) => c.name)).toEqual(['set_club_member_standing']);
    expect(member(M.kid).is_junior).toBe(false);
    expect(auditLog).toEqual([expect.objectContaining({
      member_id: M.kid, changed_by: ADMIN, previous_junior: true, new_junior: false, previous_role: 'player', new_role: 'player',
      reason: 'Turned 18, date of birth checked', source: 'club_admin', created_at: expect.anything(),
    })]);
  });
  it('still lets a junior be MARKED without a date check (that only adds protection)', async () => {
    world(null);
    member(M.coach); // adult coach
    expect((await setMemberJunior(CLUB, COACH, true)).success).toBe(true);
    expect(member(M.coach).is_junior).toBe(true);
  });
});

describe('the members PATCH path (updateClubMember)', () => {
  it('refuses a role change with no reason, and writes nothing', async () => {
    world(adult);
    const r = await updateClubMember(ADMIN, M.coach, { role: 'volunteer' });
    expect(r.success).toBe(false);
    expect(member(M.coach).role).toBe('coach');
  });
  it('changes the role through the checked function, with the reason in the audit row', async () => {
    world(adult);
    const r = await updateClubMember(ADMIN, M.coach, { role: 'volunteer', reason: 'Stepped back from coaching' });
    expect(r.success).toBe(true);
    expect(member(M.coach).role).toBe('volunteer');
    expect(auditLog).toEqual([expect.objectContaining({ member_id: M.coach, previous_role: 'coach', new_role: 'volunteer', changed_by: ADMIN, reason: 'Stepped back from coaching' })]);
  });
  it('cannot be used to clear a junior: the role call keeps their junior status as it is', async () => {
    world(null);
    await updateClubMember(ADMIN, M.kid, { role: 'volunteer', reason: 'Helping at sessions', is_junior: false });
    expect(member(M.kid).is_junior).toBe(true);
  });
  it('is refused for an admin of a different club', async () => {
    world(adult);
    statedb.tables.club_members.push({ id: UUID(20), club_id: UUID(99), user_id: OUTSIDER, role: 'club_admin', is_junior: false, is_active: true });
    expect((await updateClubMember(OUTSIDER, M.kid, { role: 'coach', reason: 'Trying it' })).success).toBe(false);
    expect(member(M.kid).role).toBe('player');
  });
  it('still switches a member off without touching role or junior status', async () => {
    world(adult);
    expect((await updateClubMember(ADMIN, M.coach, { is_active: false })).success).toBe(true);
    expect(member(M.coach)).toMatchObject({ is_active: false, role: 'coach' });
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('platform admin removing a club admin', () => {
  it('goes through the checked function and is audited as a platform change', async () => {
    world(adult);
    statedb.tables.club_members.push({ id: UUID(21), club_id: CLUB, user_id: UUID(5), role: 'club_admin', is_junior: false, is_active: true });
    const fd = new FormData(); fd.set('clubId', CLUB); fd.set('userId', UUID(5));
    await expect(removeClubAdmin(fd)).rejects.toThrow(/REDIRECT .*done=/);
    expect(member(UUID(21)).role).toBe('player');
    expect(auditLog).toEqual([expect.objectContaining({ previous_role: 'club_admin', new_role: 'player', source: 'platform_admin', changed_by: 'staff' })]);
  });
});

describe('linking a child record', () => {
  it('marks the member a junior through the checked function, and audits it', async () => {
    world(adult);
    statedb.tables.club_members.find((m) => m.id === M.kid)!.is_junior = false;
    Object.assign(statedb.tables.profiles.find((p) => p.id === KID)!, { full_name: 'Kit', display_name: 'Kit', email: 'kit@x.test' });
    const r = await linkChildToAccount([CLUB], 'k1', 'kit@x.test', ADMIN);
    expect(r.success).toBe(true);
    expect(member(M.kid).is_junior).toBe(true);
    expect(auditLog).toEqual([expect.objectContaining({ new_junior: true, previous_junior: false, source: 'child_link', changed_by: ADMIN })]);
  });
});

describe('approving a join request', () => {
  it('adds the member through the checked function, with an audit row', async () => {
    world(adult);
    const r = await decideJoinRequest(ADMIN, UUID(50), true);
    expect(r.success).toBe(true);
    expect(rpcCalls.map((c) => c.name)).toEqual(['add_club_member']);
    expect(auditLog).toEqual([expect.objectContaining({ previous_role: null, new_role: 'player', source: 'join_request', changed_by: ADMIN })]);
    expect(statedb.tables.club_members.some((m) => m.user_id === OUTSIDER)).toBe(true);
  });
  it('does not add the member if the checked function fails', async () => {
    world(adult);
    rpcFails = true;
    expect((await decideJoinRequest(ADMIN, UUID(50), true)).success).toBe(false);
    expect(statedb.tables.club_members.some((m) => m.user_id === OUTSIDER)).toBe(false);
  });
});

describe('the checked server action', () => {
  it('needs a reason', async () => {
    world(adult);
    expect((await setClubMemberStanding(M.coach, 'volunteer', false, '  ')).success).toBe(false);
    expect(auditLog).toHaveLength(0);
  });
  it('needs a club admin', async () => {
    world(adult);
    requireUser.mockResolvedValue({ id: COACH });
    expect((await setClubMemberStanding(M.coach, 'club_admin', false, 'Making myself admin')).success).toBe(false);
    expect(member(M.coach).role).toBe('coach');
  });
  it('writes who, when, old value, new value and reason', async () => {
    world(adult);
    await setClubMemberStanding(M.coach, 'volunteer', false, 'Moved to volunteering');
    expect(auditLog[0]).toMatchObject({ changed_by: ADMIN, previous_role: 'coach', new_role: 'volunteer', previous_junior: false, new_junior: false, reason: 'Moved to volunteering', created_at: expect.anything() });
  });
});

// Nothing else in the app may write role or is_junior on club_members. This reads the source so a new path cannot sneak in.
describe('no other code writes role or is_junior on club_members', () => {
  const root = path.join(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
    }
  };
  walk(root);
  it('finds no direct write', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const re = /\.from\(\s*['"]club_members['"]\s*\)[\s\S]{0,300}?\.(update|insert|upsert)\(\s*(\{[^}]*\})/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) if (/\b(role|is_junior)\b/.test(m[2])) offenders.push(`${path.relative(root, f)}: ${m[0].slice(0, 80)}`);
    }
    expect(offenders).toEqual([]);
  });
});
