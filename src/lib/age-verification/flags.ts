import { createAdminClient } from '@/lib/supabase/admin';
import { hasCurrentDbsAt } from '@/lib/admin/child-link';
import { safeguardingLeadEmail } from './alert';
import { LEAD_NOTE_REQUIRED, LEAD_NOT_ACTIVE, auditLead, leadStatus } from './lead';
import { ageVerificationEnabled } from './flag';

export type OpenFlag = { id: string; userId: string; playerName: string; ageGroup: string; reason: string; createdAt: string };

type Admin = ReturnType<typeof createAdminClient>;

/** Display names only. No date of birth is read. */
async function playerNames(admin: Admin, ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const { data } = await admin.from('profiles').select('id, display_name, full_name').in('id', ids);
  for (const p of data ?? []) names.set(p.id as string, (p.display_name as string | null) || (p.full_name as string | null) || 'A player');
  return names;
}

/** Open squad flags for a DBS-checked welfare officer. The rows do not include a date of birth. */
export async function listOpenSquadFlags(officerId: string, clubId: string): Promise<{ items: OpenFlag[]; error?: string }> {
  if (!ageVerificationEnabled()) return { items: [] };
  const admin = createAdminClient();
  const { data: role } = await admin.from('club_members').select('id').eq('user_id', officerId).eq('club_id', clubId).eq('role', 'welfare_officer').eq('is_active', true).limit(1);
  if (!role || role.length === 0) return { items: [], error: 'Only a welfare officer can review squad flags.' };
  if (!(await hasCurrentDbsAt(officerId, clubId))) return { items: [], error: 'You need a current enhanced DBS check at this club.' };
  const { data, error } = await admin.from('age_squad_mismatches').select('id, user_id, age_group, reason, created_at')
    .eq('club_id', clubId).is('resolved_at', null).order('created_at', { ascending: false }).limit(50);
  if (error) return { items: [], error: 'Could not load squad flags.' };
  const names = await playerNames(admin, (data ?? []).map((r) => r.user_id as string));
  return {
    items: (data ?? []).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      playerName: names.get(row.user_id as string) ?? 'A player',
      ageGroup: row.age_group as string,
      reason: row.reason as string,
      createdAt: row.created_at as string,
    })),
  };
}

export type ResolveResult = { success: true } | { success: false; error: string };

const COULD_NOT_RESOLVE = 'Could not resolve that flag.';

/**
 * Closes a squad flag and its safeguarding incident in ONE database transaction (resolve_age_squad_flag), so the two can
 * never be out of step. Two people may close a flag:
 *  - the club's welfare officer, with a current enhanced DBS check at that club;
 *  - an active platform safeguarding lead, but only for a club that has no welfare officer, only with a written note, and
 *    never when the flag is about the lead, the lead belongs to the club, or the lead reported the incident.
 * Every lead decision, and every refusal, is written to the audit log.
 */
export async function resolveSquadFlag(actorId: string, clubId: string, flagId: string, note?: string): Promise<ResolveResult> {
  if (!ageVerificationEnabled()) return { success: false, error: 'Squad flags are not open yet.' };
  const admin = createAdminClient();
  const { data: role } = await admin.from('club_members').select('id').eq('user_id', actorId).eq('club_id', clubId).eq('role', 'welfare_officer').eq('is_active', true).limit(1);
  if (role && role.length > 0) {
    if (!(await hasCurrentDbsAt(actorId, clubId))) return { success: false, error: 'You need a current enhanced DBS check at this club.' };
    return closeFlag(admin, { flagId, clubId, resolver: actorId, via: 'club_welfare_officer', note: note?.trim() || null });
  }

  const lead = await leadStatus(admin, actorId);
  if (!lead.active) return { success: false, error: lead.reasons.includes('not a named lead') ? 'Only a welfare officer can resolve a squad flag.' : LEAD_NOT_ACTIVE };
  const refuse = async (error: string): Promise<ResolveResult> => {
    await auditLead(admin, { leadId: actorId, action: 'refused', clubId, flagIds: [flagId], note: error });
    return { success: false, error };
  };
  const reason = note?.trim() ?? '';
  if (!reason) return refuse(LEAD_NOTE_REQUIRED);

  const [{ data: officers, error: officerError }, { data: flags, error: flagError }, { data: mine, error: mineError }] = await Promise.all([
    admin.from('club_members').select('id').eq('club_id', clubId).eq('role', 'welfare_officer').eq('is_active', true).limit(1),
    admin.from('age_squad_mismatches').select('id, user_id, incident_id').eq('id', flagId).eq('club_id', clubId).is('resolved_at', null).limit(1),
    admin.from('club_members').select('id').eq('club_id', clubId).eq('user_id', actorId).eq('is_active', true).limit(1),
  ]);
  if (officerError || flagError || mineError) return refuse(COULD_NOT_RESOLVE);
  if ((officers ?? []).length > 0) return refuse('This club has a welfare officer, so the flag is theirs to close.');
  const flag = (flags ?? [])[0] as { user_id: string; incident_id: string | null } | undefined;
  if (!flag) return refuse(COULD_NOT_RESOLVE);
  if (flag.user_id === actorId) return refuse(LEAD_CONFLICT);
  if ((mine ?? []).length > 0) return refuse(LEAD_CONFLICT);
  if (flag.incident_id) {
    const { data: incident, error: incidentError } = await admin.from('safeguarding_incidents').select('reported_by').eq('id', flag.incident_id).limit(1);
    if (incidentError) return refuse(COULD_NOT_RESOLVE);
    if (((incident ?? [])[0] as { reported_by?: string } | undefined)?.reported_by === actorId) return refuse(LEAD_CONFLICT);
  }
  return closeFlag(admin, { flagId, clubId, resolver: actorId, via: 'platform_lead', note: reason });
}

export const LEAD_CONFLICT = 'You cannot decide this flag because it involves you or your own club. Another lead will need to.';

async function closeFlag(admin: ReturnType<typeof createAdminClient>, input: { flagId: string; clubId: string; resolver: string; via: 'club_welfare_officer' | 'platform_lead'; note: string | null }): Promise<ResolveResult> {
  const { error } = await admin.rpc('resolve_age_squad_flag', {
    p_flag: input.flagId,
    p_club: input.clubId,
    p_resolver: input.resolver,
    p_via: input.via,
    p_note: input.note,
  });
  if (error) {
    console.error('[age-verification] could not resolve a squad flag');
    return { success: false, error: COULD_NOT_RESOLVE };
  }
  return { success: true };
}

export type FallbackFlags = {
  /** True when the club has no active welfare officer. The screen only shows for those clubs. */
  noWelfareOfficer: boolean;
  items: OpenFlag[];
  purges: Array<{ id: string; purgedAt: string; alertSent: boolean }>;
  alertTo: string;
  error?: string;
};

/**
 * A club with no welfare officer has nobody who may close a squad flag. Its DBS-checked club admin can still see the
 * open flags and the deletion records, read only. Alerts for the club go to SAFEGUARDING_LEAD_EMAIL.
 */
export async function listFlagsForClubWithoutOfficer(adminId: string, clubId: string): Promise<FallbackFlags> {
  const empty: FallbackFlags = { noWelfareOfficer: false, items: [], purges: [], alertTo: safeguardingLeadEmail() };
  if (!ageVerificationEnabled()) return empty;
  const admin = createAdminClient();
  const { data: officers, error: officerError } = await admin.from('club_members').select('id').eq('club_id', clubId).eq('role', 'welfare_officer').eq('is_active', true).limit(1);
  if (officerError) return { ...empty, error: 'Could not check whether this club has a welfare officer.' };
  if ((officers ?? []).length > 0) return empty;
  const { data: role } = await admin.from('club_members').select('id').eq('user_id', adminId).eq('club_id', clubId).eq('role', 'club_admin').eq('is_active', true).limit(1);
  if (!role || role.length === 0) return { ...empty, noWelfareOfficer: true, error: 'Only a club admin can see these flags.' };
  if (!(await hasCurrentDbsAt(adminId, clubId))) return { ...empty, noWelfareOfficer: true, error: 'You need a current enhanced DBS check at this club.' };
  const [{ data: flags, error: flagError }, { data: purges, error: purgeError }] = await Promise.all([
    admin.from('age_squad_mismatches').select('id, user_id, age_group, reason, created_at').eq('club_id', clubId).is('resolved_at', null).order('created_at', { ascending: false }).limit(50),
    admin.from('age_verification_purges').select('id, club_ids, purged_at, alert_sent_at').contains('club_ids', [clubId]).order('created_at', { ascending: false }).limit(50),
  ]);
  if (flagError || purgeError) return { ...empty, noWelfareOfficer: true, error: 'Could not load squad flags.' };
  const names = await playerNames(admin, (flags ?? []).map((r) => r.user_id as string));
  return {
    noWelfareOfficer: true,
    alertTo: safeguardingLeadEmail(),
    items: (flags ?? []).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      playerName: names.get(row.user_id as string) ?? 'A player',
      ageGroup: row.age_group as string,
      reason: row.reason as string,
      createdAt: row.created_at as string,
    })),
    purges: (purges ?? [])
      .filter((row) => ((row.club_ids as string[] | null) ?? []).includes(clubId) && !!row.purged_at)
      .map((row) => ({ id: row.id as string, purgedAt: row.purged_at as string, alertSent: !!row.alert_sent_at })),
  };
}
