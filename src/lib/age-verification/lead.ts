import { createAdminClient } from '@/lib/supabase/admin';
import { ageVerificationEnabled } from './flag';

type Admin = ReturnType<typeof createAdminClient>;

/**
 * The platform safeguarding lead looks at squad flags for clubs that have no welfare officer. It is a role held by named
 * people only (a row in platform_safeguarding_leads, written by SHIFTUP staff, never by the app) and it is inactive unless
 * BOTH an enhanced DBS check date and a safeguarding training date are current. The windows are a policy choice and are
 * the same as in platform_lead_is_active() in migration 20261130000008. Change them in both places.
 */
export const LEAD_DBS_MAX_AGE_YEARS = 3;
export const LEAD_TRAINING_MAX_AGE_MONTHS = 12;

export const LEAD_NOT_ACTIVE = 'You are not an active safeguarding lead. The role needs a current DBS check date and a current training date.';
export const LEAD_NOTE_REQUIRED = 'Say why you are closing this flag.';

export type LeadRow = { user_id: string; dbs_checked_on: string | null; training_completed_on: string | null; revoked_at: string | null };

function addToDate(date: string, years: number, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Why a lead is not active, as plain reasons. Empty means active. `today` is a YYYY-MM-DD date (UK day). */
export function leadInactiveReasons(row: LeadRow | null | undefined, today: string): string[] {
  if (!row) return ['not a named lead'];
  const reasons: string[] = [];
  if (row.revoked_at) reasons.push('the role was withdrawn');
  if (!row.dbs_checked_on) reasons.push('no DBS check date');
  else if (row.dbs_checked_on > today) reasons.push('the DBS check date is in the future');
  else if (addToDate(row.dbs_checked_on, LEAD_DBS_MAX_AGE_YEARS, 0) <= today) reasons.push(`the DBS check is more than ${LEAD_DBS_MAX_AGE_YEARS} years old`);
  if (!row.training_completed_on) reasons.push('no training date');
  else if (row.training_completed_on > today) reasons.push('the training date is in the future');
  else if (addToDate(row.training_completed_on, 0, LEAD_TRAINING_MAX_AGE_MONTHS) <= today) reasons.push(`the training is more than ${LEAD_TRAINING_MAX_AGE_MONTHS} months old`);
  return reasons;
}

export function ukDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export async function leadStatus(admin: Admin, userId: string): Promise<{ active: boolean; reasons: string[] }> {
  const { data } = await admin.from('platform_safeguarding_leads')
    .select('user_id, dbs_checked_on, training_completed_on, revoked_at').eq('user_id', userId).limit(1);
  const reasons = leadInactiveReasons(((data ?? [])[0] as LeadRow | undefined) ?? null, ukDay());
  return { active: reasons.length === 0, reasons };
}

export type LeadAction = 'view_queue' | 'resolve' | 'refused';

/** Writes the audit row. Returns false when it could not be written, and callers then show nothing and decide nothing. */
export async function auditLead(admin: Admin, row: { leadId: string; action: LeadAction; clubId?: string | null; flagIds?: string[]; note?: string | null }): Promise<boolean> {
  const { error } = await admin.from('safeguarding_lead_audit').insert({
    lead_id: row.leadId,
    action: row.action,
    club_id: row.clubId ?? null,
    flag_ids: row.flagIds ?? [],
    note: row.note ?? null,
  });
  if (error) console.error('[age-verification] could not write the lead audit row');
  return !error;
}

export type LeadFlag = {
  id: string;
  clubId: string;
  clubName: string;
  playerName: string;
  ageGroup: string;
  reason: 'mismatch' | 'unverified';
  createdAt: string;
  daysOpen: number;
};

/**
 * Open flags at clubs with no active welfare officer, for an active lead. A flag is left out when the lead cannot decide
 * it: it is about the lead, the lead belongs to that club, or the lead reported its incident. Opening the queue is
 * audited BEFORE anything is returned, so a view that cannot be recorded does not happen.
 */
export async function listLeadQueue(leadId: string, now: Date = new Date()): Promise<{ items: LeadFlag[]; skippedForConflict: number; error?: string }> {
  const none = { items: [] as LeadFlag[], skippedForConflict: 0 };
  if (!ageVerificationEnabled()) return none;
  const admin = createAdminClient();
  const status = await leadStatus(admin, leadId);
  if (!status.active) return { ...none, error: LEAD_NOT_ACTIVE };

  const { data: flags, error } = await admin.from('age_squad_mismatches')
    .select('id, club_id, user_id, age_group, reason, created_at, incident_id').is('resolved_at', null).order('created_at', { ascending: true }).limit(200);
  if (error) return { ...none, error: 'Could not load the queue.' };
  const open = flags ?? [];
  const clubIds = [...new Set(open.map((f) => f.club_id as string))];
  if (clubIds.length === 0) {
    if (!(await auditLead(admin, { leadId, action: 'view_queue' }))) return { ...none, error: 'The view could not be recorded, so the queue was not shown.' };
    return none;
  }

  const [officers, mine, clubs, incidents] = await Promise.all([
    admin.from('club_members').select('club_id').in('club_id', clubIds).eq('role', 'welfare_officer').eq('is_active', true),
    admin.from('club_members').select('club_id').eq('user_id', leadId).eq('is_active', true),
    admin.from('clubs').select('id, name').in('id', clubIds),
    admin.from('safeguarding_incidents').select('id, reported_by').in('id', open.map((f) => f.incident_id as string | null).filter((id): id is string => !!id)),
  ]);
  if (officers.error || mine.error || clubs.error || incidents.error) return { ...none, error: 'Could not load the queue.' };

  const withOfficer = new Set((officers.data ?? []).map((r) => r.club_id as string));
  const myClubs = new Set((mine.data ?? []).map((r) => r.club_id as string));
  const clubName = new Map((clubs.data ?? []).map((c) => [c.id as string, (c.name as string) || 'A club']));
  const reporter = new Map((incidents.data ?? []).map((i) => [i.id as string, i.reported_by as string]));

  const noOfficer = open.filter((f) => !withOfficer.has(f.club_id as string));
  const deciding = noOfficer.filter((f) => f.user_id !== leadId && !myClubs.has(f.club_id as string) && reporter.get(f.incident_id as string) !== leadId);
  const skippedForConflict = noOfficer.length - deciding.length;

  const playerIds = [...new Set(deciding.map((f) => f.user_id as string))];
  const profiles = playerIds.length === 0 ? { data: [], error: null } : await admin.from('profiles').select('id, display_name, full_name').in('id', playerIds);
  if (profiles.error) return { ...none, error: 'Could not load the queue.' };
  const name = new Map((profiles.data ?? []).map((p) => [p.id as string, ((p.display_name as string | null) || (p.full_name as string | null) || 'A player')]));

  const items: LeadFlag[] = deciding.map((f) => ({
    id: f.id as string,
    clubId: f.club_id as string,
    clubName: clubName.get(f.club_id as string) ?? 'A club',
    playerName: name.get(f.user_id as string) ?? 'A player',
    ageGroup: f.age_group as string,
    reason: f.reason as 'mismatch' | 'unverified',
    createdAt: f.created_at as string,
    daysOpen: Math.max(0, Math.floor((now.getTime() - new Date(f.created_at as string).getTime()) / 86_400_000)),
  }));

  if (!(await auditLead(admin, { leadId, action: 'view_queue', flagIds: items.map((i) => i.id) }))) {
    return { ...none, error: 'The view could not be recorded, so the queue was not shown.' };
  }
  return { items, skippedForConflict };
}

/** Email addresses of active leads, for alerts. SAFEGUARDING_LEAD_EMAIL is added by the caller as an extra copy only. */
export async function activeLeadEmails(admin: Admin): Promise<{ emails: string[] } | { error: string }> {
  const { data: leads, error } = await admin.from('platform_safeguarding_leads').select('user_id, dbs_checked_on, training_completed_on, revoked_at');
  if (error) return { error: 'could not read the safeguarding leads' };
  const today = ukDay();
  const active = ((leads ?? []) as LeadRow[]).filter((l) => leadInactiveReasons(l, today).length === 0).map((l) => l.user_id);
  if (active.length === 0) return { emails: [] };
  const { data: profiles, error: profileError } = await admin.from('profiles').select('email').in('id', active);
  if (profileError) return { error: 'could not read the safeguarding lead emails' };
  return { emails: (profiles ?? []).map((p) => p.email as string | null).filter((e): e is string => !!e) };
}

export const LEAD_QUEUE_PATH = '/safeguarding-lead';
