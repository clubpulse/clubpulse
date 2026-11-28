/**
 * @jest-environment node
 */
// The platform safeguarding lead: the role and its dates, the queue, deciding a flag, conflict of interest, the audit
// log, alerts that name the club and the player, and the hand-over to a new welfare officer.
import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { statedb, statedbClient } from './helpers/statedb';
import { installResolveFlagRpc } from './helpers/resolve-flag-rpc';

installResolveFlagRpc();
const sent: Array<{ to: string; subject: string; text: string }> = [];
let emailOk = true;
let dbsOk = true;
let auditFails = false;

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    const base = statedbClient();
    return {
      ...base,
      from: (t: string) => {
        if (auditFails && t === 'safeguarding_lead_audit') return { insert: async () => ({ error: { message: 'boom' } }) } as never;
        return base.from(t);
      },
    };
  },
}));
jest.mock('@/lib/email/resend', () => ({ sendEmail: async (m: { to: string; subject: string; text: string }) => { if (emailOk) sent.push(m); return emailOk; } }));
jest.mock('@/lib/admin/child-link', () => ({ hasCurrentDbsAt: async () => dbsOk }));

import { LEAD_CONFLICT, listFlagsForClubWithoutOfficer, resolveSquadFlag } from '@/lib/age-verification/flags';
import { LEAD_NOTE_REQUIRED, LEAD_NOT_ACTIVE, leadInactiveReasons, listLeadQueue, ukDay } from '@/lib/age-verification/lead';
import { guardSquad } from '@/lib/age-verification/squad';
import { sendHandoverNotices } from '@/lib/age-verification/handover';
import { sendPurgeAlerts } from '@/lib/age-verification/purge';
import { handoverAlert, noWelfareOfficerAlert, purgeAlert, squadAlert } from '@/lib/age-verification/alert';
import { NoWelfareOfficerPanel } from '@/components/club/NoWelfareOfficerPanel';

const today = ukDay();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const OK_LEAD = { dbs_checked_on: daysAgo(100), training_completed_on: daysAgo(30), revoked_at: null, granted_by: 'staff' };

function world(over: Record<string, unknown[]> = {}) {
  return {
    clubs: [{ id: 'away', name: 'Away CC' }, { id: 'home', name: 'Home CC' }, { id: 'staffed', name: 'Staffed CC' }],
    profiles: [
      { id: 'lead-1', email: 'lead1@shiftup.test', display_name: 'Lead One' },
      { id: 'lead-2', email: 'lead2@shiftup.test', display_name: 'Lead Two' },
      { id: 'old-lead', email: 'old@shiftup.test', display_name: 'Old Lead' },
      { id: 'p1', email: 'p1@x.test', display_name: 'Pat Player', full_name: 'Pat Player', date_of_birth: '1990-01-01' },
      { id: 'p2', email: 'p2@x.test', display_name: 'Sam Second', date_of_birth: '2012-05-05' },
      { id: 'officer-1', email: 'officer@staffed.test', display_name: 'Officer' },
    ],
    platform_safeguarding_leads: [
      { user_id: 'lead-1', ...OK_LEAD },
      { user_id: 'lead-2', ...OK_LEAD },
      { user_id: 'old-lead', ...OK_LEAD, training_completed_on: daysAgo(400) },
    ],
    club_members: [
      { user_id: 'p1', club_id: 'away', is_active: true, role: 'player', is_junior: false },
      { user_id: 'p2', club_id: 'home', is_active: true, role: 'player', is_junior: true },
      { user_id: 'officer-1', club_id: 'staffed', is_active: true, role: 'welfare_officer' },
      { user_id: 'p1', club_id: 'staffed', is_active: true, role: 'player', is_junior: false },
    ],
    age_squad_mismatches: [
      { id: 'f-away', club_id: 'away', user_id: 'p1', age_group: 'U15', reason: 'unverified', incident_id: 'i-away', created_at: '2026-11-20T10:00:00Z', resolved_at: null },
      { id: 'f-home', club_id: 'home', user_id: 'p2', age_group: 'U13', reason: 'mismatch', incident_id: 'i-home', created_at: '2026-11-22T10:00:00Z', resolved_at: null },
      { id: 'f-staffed', club_id: 'staffed', user_id: 'p1', age_group: 'U15', reason: 'unverified', incident_id: null, created_at: '2026-11-23T10:00:00Z', resolved_at: null },
    ],
    safeguarding_incidents: [
      { id: 'i-away', club_id: 'away', reported_by: 'admin-x', status: 'reported' },
      { id: 'i-home', club_id: 'home', reported_by: 'admin-y', status: 'reported' },
    ],
    safeguarding_lead_audit: [], age_flag_handovers: [], age_verification_purges: [],
    age_verifications: [], guardian_consents: [], child_profiles: [],
    ...over,
  } as Record<string, any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const saved = { ...process.env };
beforeEach(() => {
  process.env.AGE_VERIFICATION_ENABLED = 'true';
  process.env.SAFEGUARDING_LEAD_EMAIL = 'copy@shiftup.test';
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
  sent.length = 0; emailOk = true; dbsOk = true; auditFails = false;
  statedb.failOn = null;
  statedb.reset(world());
});
afterAll(() => { process.env = saved; });

describe('the role is inactive unless both dates are current', () => {
  const row = (over: Record<string, unknown> = {}) => ({ user_id: 'u', dbs_checked_on: daysAgo(10), training_completed_on: daysAgo(10), revoked_at: null, ...over }) as never;
  it('is active with a current DBS date and current training', () => {
    expect(leadInactiveReasons(row(), today)).toEqual([]);
  });
  it('is inactive with no DBS date, no training date, either one out of date, or the role withdrawn', () => {
    expect(leadInactiveReasons(row({ dbs_checked_on: null }), today)).toContain('no DBS check date');
    expect(leadInactiveReasons(row({ training_completed_on: null }), today)).toContain('no training date');
    expect(leadInactiveReasons(row({ dbs_checked_on: daysAgo(3 * 366) }), today).join()).toMatch(/DBS check is more than 3 years/);
    expect(leadInactiveReasons(row({ training_completed_on: daysAgo(370) }), today).join()).toMatch(/training is more than 12 months/);
    expect(leadInactiveReasons(row({ revoked_at: '2026-01-01T00:00:00Z' }), today)).toContain('the role was withdrawn');
    expect(leadInactiveReasons(null, today)).toEqual(['not a named lead']);
  });
  it('does not accept a date in the future', () => {
    expect(leadInactiveReasons(row({ dbs_checked_on: daysAgo(-5) }), today).length).toBeGreaterThan(0);
  });
  it('the migration enforces the same two windows', () => {
    const sql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261130000008_platform_safeguarding_lead.sql'), 'utf8');
    expect(sql).toMatch(/dbs_checked_on > CURRENT_DATE - INTERVAL '3 years'/);
    expect(sql).toMatch(/training_completed_on > CURRENT_DATE - INTERVAL '1 year'/);
  });
});

describe('the queue', () => {
  it('shows an active lead only open flags at clubs with no welfare officer, with the club and the player named', async () => {
    const queue = await listLeadQueue('lead-1');
    expect(queue.error).toBeUndefined();
    expect(queue.items.map((i) => i.id).sort()).toEqual(['f-away', 'f-home']);
    expect(queue.items.find((i) => i.id === 'f-away')).toMatchObject({ clubName: 'Away CC', playerName: 'Pat Player', ageGroup: 'U15', reason: 'unverified' });
    expect(JSON.stringify(queue)).not.toMatch(/date_of_birth|1990-01-01|2012-05-05/);
  });

  it('shows nothing, and writes nothing, to someone who is not an active lead', async () => {
    for (const who of ['p1', 'old-lead']) {
      const queue = await listLeadQueue(who);
      expect(queue.items).toEqual([]);
      expect(queue.error).toBe(LEAD_NOT_ACTIVE);
    }
    expect(statedb.tables.safeguarding_lead_audit).toEqual([]);
  });

  it('records every view with the flags that were shown', async () => {
    await listLeadQueue('lead-1');
    expect(statedb.tables.safeguarding_lead_audit).toHaveLength(1);
    expect(statedb.tables.safeguarding_lead_audit[0]).toMatchObject({ lead_id: 'lead-1', action: 'view_queue' });
    expect(statedb.tables.safeguarding_lead_audit[0].flag_ids.sort()).toEqual(['f-away', 'f-home']);
  });

  it('records an empty view too', async () => {
    statedb.tables.age_squad_mismatches = [];
    const queue = await listLeadQueue('lead-1');
    expect(queue.items).toEqual([]);
    expect(statedb.tables.safeguarding_lead_audit).toHaveLength(1);
  });

  it('shows nothing when the view cannot be recorded', async () => {
    auditFails = true;
    const queue = await listLeadQueue('lead-1');
    expect(queue.items).toEqual([]);
    expect(queue.error).toMatch(/could not be recorded/);
  });

  it('leaves out what the lead cannot decide: a flag about them, their own club, an incident they reported', async () => {
    statedb.tables.club_members.push({ user_id: 'lead-1', club_id: 'home', is_active: true, role: 'player' });
    statedb.tables.age_squad_mismatches.push({ id: 'f-self', club_id: 'away', user_id: 'lead-1', age_group: 'U15', reason: 'mismatch', incident_id: null, created_at: '2026-11-24T10:00:00Z', resolved_at: null });
    statedb.tables.safeguarding_incidents[0].reported_by = 'lead-1';
    const queue = await listLeadQueue('lead-1');
    expect(queue.items).toEqual([]);
    expect(queue.skippedForConflict).toBe(3);
    // the other lead sees them
    const other = await listLeadQueue('lead-2');
    expect(other.items.map((i) => i.id).sort()).toEqual(['f-away', 'f-home', 'f-self']);
  });

  it('is off while the flag is off', async () => {
    process.env.AGE_VERIFICATION_ENABLED = 'false';
    expect((await listLeadQueue('lead-1')).items).toEqual([]);
    expect(statedb.tables.safeguarding_lead_audit).toEqual([]);
  });
});

describe('a lead deciding a flag', () => {
  it('closes the flag and its incident in one database call, and the audit row records who, which flag and why', async () => {
    expect(await resolveSquadFlag('lead-1', 'away', 'f-away', 'Club admin confirmed the date of birth')).toEqual({ success: true });
    expect(statedb.rpcCalls).toHaveLength(1);
    expect(statedb.rpcCalls[0].args).toMatchObject({ p_flag: 'f-away', p_club: 'away', p_resolver: 'lead-1', p_via: 'platform_lead' });
    expect(statedb.tables.age_squad_mismatches.find((f) => f.id === 'f-away')).toMatchObject({ resolved_by: 'lead-1', resolved_via: 'platform_lead' });
    expect(statedb.tables.safeguarding_incidents.find((i) => i.id === 'i-away')?.status).toBe('resolved');
    expect(statedb.tables.safeguarding_lead_audit).toEqual([expect.objectContaining({ lead_id: 'lead-1', action: 'resolve', club_id: 'away', flag_ids: ['f-away'], note: 'Club admin confirmed the date of birth' })]);
  });

  it('needs a written note, and a refusal is audited', async () => {
    for (const note of [undefined, '', '   ']) expect(await resolveSquadFlag('lead-1', 'away', 'f-away', note)).toEqual({ success: false, error: LEAD_NOTE_REQUIRED });
    expect(statedb.rpcCalls).toEqual([]);
    expect(statedb.tables.age_squad_mismatches.find((f) => f.id === 'f-away')?.resolved_at).toBeNull();
    expect(statedb.tables.safeguarding_lead_audit.every((r) => r.action === 'refused')).toBe(true);
    expect(statedb.tables.safeguarding_lead_audit).toHaveLength(3);
  });

  it('is refused for a lead whose training or DBS date is out of date, and for anyone who is not a lead', async () => {
    expect(await resolveSquadFlag('old-lead', 'away', 'f-away', 'x')).toEqual({ success: false, error: LEAD_NOT_ACTIVE });
    expect(await resolveSquadFlag('p1', 'away', 'f-away', 'x')).toEqual({ success: false, error: 'Only a welfare officer can resolve a squad flag.' });
    expect(statedb.rpcCalls).toEqual([]);
  });

  it('is refused when the flag is about the lead', async () => {
    statedb.tables.age_squad_mismatches[0].user_id = 'lead-1';
    expect(await resolveSquadFlag('lead-1', 'away', 'f-away', 'mine')).toEqual({ success: false, error: LEAD_CONFLICT });
    expect(statedb.rpcCalls).toEqual([]);
    expect(statedb.tables.safeguarding_lead_audit).toEqual([expect.objectContaining({ action: 'refused', lead_id: 'lead-1', flag_ids: ['f-away'] })]);
  });

  it('is refused when the lead belongs to the club', async () => {
    statedb.tables.club_members.push({ user_id: 'lead-1', club_id: 'away', is_active: true, role: 'coach' });
    expect(await resolveSquadFlag('lead-1', 'away', 'f-away', 'my club')).toEqual({ success: false, error: LEAD_CONFLICT });
    expect(statedb.rpcCalls).toEqual([]);
  });

  it('is refused when the lead reported the incident', async () => {
    statedb.tables.safeguarding_incidents[0].reported_by = 'lead-1';
    expect(await resolveSquadFlag('lead-1', 'away', 'f-away', 'I raised it')).toEqual({ success: false, error: LEAD_CONFLICT });
  });

  it('is refused once the club has a welfare officer, who then owns the flag', async () => {
    expect(await resolveSquadFlag('lead-1', 'staffed', 'f-staffed', 'x')).toMatchObject({ success: false, error: expect.stringMatching(/has a welfare officer/) });
    expect(statedb.rpcCalls).toEqual([]);
  });

  it('cannot close a flag twice or a flag at another club', async () => {
    await resolveSquadFlag('lead-1', 'away', 'f-away', 'done');
    expect(await resolveSquadFlag('lead-1', 'away', 'f-away', 'again')).toMatchObject({ success: false });
    expect(await resolveSquadFlag('lead-2', 'home', 'f-away', 'wrong club')).toMatchObject({ success: false });
  });

  it('leaves the flag open and says so when the database refuses', async () => {
    statedb.failOn = 'safeguarding_incidents';
    const res = await resolveSquadFlag('lead-1', 'away', 'f-away', 'x');
    statedb.failOn = null;
    expect(res.success).toBe(false);
    expect(statedb.tables.age_squad_mismatches.find((f) => f.id === 'f-away')?.resolved_at).toBeNull();
  });

  it('a club welfare officer still closes their own flags, with a DBS check, and no lead audit row is written', async () => {
    expect(await resolveSquadFlag('officer-1', 'staffed', 'f-staffed')).toEqual({ success: true });
    expect(statedb.rpcCalls[0].args).toMatchObject({ p_via: 'club_welfare_officer', p_resolver: 'officer-1' });
    expect(statedb.tables.safeguarding_lead_audit).toEqual([]);
    statedb.tables.age_squad_mismatches.push({ id: 'f2', club_id: 'staffed', user_id: 'p1', age_group: 'U15', reason: 'mismatch', incident_id: null, resolved_at: null });
    dbsOk = false;
    expect(await resolveSquadFlag('officer-1', 'staffed', 'f2')).toMatchObject({ success: false });
  });
});

describe('alerts say enough to act on', () => {
  async function refuseP1At(club: string) {
    statedb.tables.age_squad_mismatches = [];
    statedb.tables.safeguarding_incidents = [];
    statedb.tables.club_members.push({ user_id: 'coach-1', club_id: club, is_active: true, role: 'coach' });
    statedb.tables.club_members = statedb.tables.club_members.filter((m) => !(m.user_id === 'p1' && m.club_id !== club));
    return guardSquad(statedbClient() as never, { clubId: club, actorId: 'coach-1', userIds: ['p1'], ageGroup: 'U15' });
  }

  it('with no welfare officer: names the club, the player, the squad, why, the reference and where to go, and goes to the active leads', async () => {
    await refuseP1At('away');
    const flag = statedb.tables.age_squad_mismatches[0];
    const to = sent.map((m) => m.to).sort();
    expect(to).toEqual(['copy@shiftup.test', 'lead1@shiftup.test', 'lead2@shiftup.test']);
    expect(sent.some((m) => m.to === 'old@shiftup.test')).toBe(false);
    const mail = sent.find((m) => m.to === 'lead1@shiftup.test')!;
    expect(mail.subject).toContain('Away CC');
    expect(mail.subject).toContain('Pat Player');
    for (const part of ['Club: Away CC (no welfare officer)', 'Player: Pat Player', 'Squad: U15', 'Why it was held: ', `Reference: ${flag.id}`, 'https://app.test/safeguarding-lead', 'Open flags at this club: 1']) expect(mail.text).toContain(part);
    expect(mail.text).not.toMatch(/1990|date_of_birth/);
  });

  it('the environment address is only an extra copy: the leads still get it when it is unset', async () => {
    delete process.env.SAFEGUARDING_LEAD_EMAIL;
    await refuseP1At('away');
    expect(sent.map((m) => m.to)).toEqual(expect.arrayContaining(['lead1@shiftup.test', 'lead2@shiftup.test']));
  });

  it('is not sent as a lead alert when the club has an officer: the officer gets it, naming the club', async () => {
    await refuseP1At('staffed');
    const officerMail = sent.find((m) => m.to === 'officer@staffed.test')!;
    expect(officerMail.subject).toContain('Staffed CC');
    expect(officerMail.text).toContain('Pat Player');
    expect(officerMail.text).toContain('Staffed CC');
    expect(sent.some((m) => m.to === 'lead1@shiftup.test')).toBe(false);
  });

  it('reports a failed send instead of saying all was well', async () => {
    emailOk = false;
    const res = await refuseP1At('away');
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/alert could not be sent/) });
  });

  it('the follow-up purge alert names the club, says which have no welfare officer, and goes to the leads', async () => {
    statedb.tables.age_verification_purges.push({ id: 'r1', club_ids: ['away', 'staffed'], purged_at: '2026-11-25T00:00:00Z', alert_sent_at: null, alert_attempts: 0 });
    await sendPurgeAlerts(statedbClient() as never);
    const lead = sent.find((m) => m.to === 'lead1@shiftup.test')!;
    expect(lead.text).toContain('Away CC, Staffed CC');
    expect(lead.text).toContain('No welfare officer at: Away CC');
    expect(lead.text).toContain('Reference: r1');
    expect(lead.subject).toContain('Away CC');
    expect(sent.some((m) => m.to === 'officer@staffed.test')).toBe(true);
    expect(lead.text).not.toMatch(/@|date of birth:/i);
  });

  it('text builders never carry a date of birth', () => {
    const texts = [
      squadAlert({ playerName: 'A', ageGroup: 'U15', reason: 'mismatch', clubName: 'C' }).text,
      noWelfareOfficerAlert({ clubName: 'C', playerName: 'A', ageGroup: 'U15', reason: 'unverified', raisedAt: '2026-11-20T10:00:00Z' }).text,
      purgeAlert({ recordId: 'r', purgedAt: '2026-11-25T00:00:00Z', clubs: [{ name: 'C', noWelfareOfficer: true }] }).text,
      handoverAlert({ clubName: 'C', count: 2 }).text,
    ];
    for (const t of texts) expect(t).toMatch(/does not include a (name, an email address or a )?date of birth/);
  });
});

describe('the screen for a club with no welfare officer shows who the flag is about', () => {
  it('names the player and says leads review it', async () => {
    statedb.tables.club_members.push({ user_id: 'admin-1', club_id: 'away', is_active: true, role: 'club_admin' });
    const data = await listFlagsForClubWithoutOfficer('admin-1', 'away');
    expect(data.items[0]).toMatchObject({ playerName: 'Pat Player', ageGroup: 'U15' });
    const html = renderToStaticMarkup(createElement(NoWelfareOfficerPanel, { data }));
    expect(html).toContain('Pat Player');
    expect(html).toMatch(/safeguarding leads review these flags/);
    expect(html).not.toMatch(/1990/);
  });
});

describe('hand-over to a new welfare officer', () => {
  const handedOver = (officer = 'officer-1', club = 'away') => [
    { id: 'h1', flag_id: 'f-away', club_id: club, officer_id: officer, notified_at: null },
  ];

  it('emails the officer once about the flags still open, and marks them notified without deleting anything', async () => {
    statedb.tables.age_flag_handovers = handedOver();
    const result = await sendHandoverNotices(statedbClient() as never);
    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('officer@staffed.test');
    expect(sent[0].subject).toContain('1 open squad flag handed to you at Away CC');
    expect(statedb.tables.age_flag_handovers).toHaveLength(1);
    expect(statedb.tables.age_flag_handovers[0].notified_at).toBeTruthy();
    expect((await sendHandoverNotices(statedbClient() as never)).sent).toBe(0);
  });

  it('keeps the history: the lead audit and the flags are untouched', async () => {
    await listLeadQueue('lead-1');
    statedb.tables.age_flag_handovers = handedOver();
    await sendHandoverNotices(statedbClient() as never);
    expect(statedb.tables.safeguarding_lead_audit).toHaveLength(1);
    expect(statedb.tables.age_squad_mismatches).toHaveLength(3);
  });

  it('does not tell the officer about flags already closed', async () => {
    statedb.tables.age_squad_mismatches[0].resolved_at = '2026-11-26T00:00:00Z';
    statedb.tables.age_flag_handovers = handedOver();
    const result = await sendHandoverNotices(statedbClient() as never);
    expect(result.sent).toBe(0);
    expect(sent).toEqual([]);
    expect(statedb.tables.age_flag_handovers[0].notified_at).toBeTruthy();
  });

  it('tries again next time when the email fails', async () => {
    statedb.tables.age_flag_handovers = handedOver();
    emailOk = false;
    expect(await sendHandoverNotices(statedbClient() as never)).toEqual({ sent: 0, failed: 1 });
    expect(statedb.tables.age_flag_handovers[0].notified_at).toBeNull();
    emailOk = true;
    expect((await sendHandoverNotices(statedbClient() as never)).sent).toBe(1);
  });

  it('after a welfare officer is named, the lead queue no longer shows that club', async () => {
    statedb.tables.club_members.push({ user_id: 'officer-2', club_id: 'away', is_active: true, role: 'welfare_officer' });
    const queue = await listLeadQueue('lead-1');
    expect(queue.items.map((i) => i.id)).toEqual(['f-home']);
  });

  it('the cron route runs the notices', () => {
    const src = fs.readFileSync(path.join(__dirname, '../app/api/cron/age-verification-purge/route.ts'), 'utf8');
    expect(src).toContain('sendHandoverNotices');
  });
});
