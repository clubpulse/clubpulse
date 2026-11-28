import { createAdminClient } from '@/lib/supabase/admin';
import { hasCurrentDbsAt } from '@/lib/admin/child-link';
import { safeguardingLeadEmail } from './alert';
import { ageVerificationEnabled } from './flag';

export type OpenFlag = { id: string; userId: string; ageGroup: string; reason: string; createdAt: string };

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
  return {
    items: (data ?? []).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      ageGroup: row.age_group as string,
      reason: row.reason as string,
      createdAt: row.created_at as string,
    })),
  };
}

export async function resolveSquadFlag(officerId: string, clubId: string, flagId: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!ageVerificationEnabled()) return { success: false, error: 'Squad flags are not open yet.' };
  const admin = createAdminClient();
  const { data: role } = await admin.from('club_members').select('id').eq('user_id', officerId).eq('club_id', clubId).eq('role', 'welfare_officer').eq('is_active', true).limit(1);
  if (!role || role.length === 0) return { success: false, error: 'Only a welfare officer can resolve a squad flag.' };
  if (!(await hasCurrentDbsAt(officerId, clubId))) return { success: false, error: 'You need a current enhanced DBS check at this club.' };
  const resolvedAt = new Date().toISOString();
  const { data, error } = await admin.from('age_squad_mismatches').update({
    resolved_at: resolvedAt,
    resolved_by: officerId,
  }).eq('id', flagId).eq('club_id', clubId).is('resolved_at', null).select('id, incident_id');
  if (error || !data || data.length === 0) return { success: false, error: 'Could not resolve that flag.' };
  // The flag and its safeguarding incident close together, so a closed flag never leaves an open incident behind.
  const incidentId = (data[0] as { incident_id?: string | null }).incident_id;
  if (incidentId) {
    const { error: incidentError } = await admin.from('safeguarding_incidents')
      .update({ status: 'resolved', resolved_at: resolvedAt, updated_at: resolvedAt })
      .eq('id', incidentId).eq('club_id', clubId);
    if (incidentError) {
      console.error('[age-verification] could not close the safeguarding incident for a resolved flag');
      return { success: false, error: 'The flag was closed but its safeguarding incident could not be updated. Close it from the incidents list.' };
    }
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
  return {
    noWelfareOfficer: true,
    alertTo: safeguardingLeadEmail(),
    items: (flags ?? []).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      ageGroup: row.age_group as string,
      reason: row.reason as string,
      createdAt: row.created_at as string,
    })),
    purges: (purges ?? [])
      .filter((row) => ((row.club_ids as string[] | null) ?? []).includes(clubId) && !!row.purged_at)
      .map((row) => ({ id: row.id as string, purgedAt: row.purged_at as string, alertSent: !!row.alert_sent_at })),
  };
}
