import type { SupabaseClient } from '@supabase/supabase-js';
import { ageOn } from '@/lib/community/age';
import { sendEmail } from '@/lib/email/resend';
import { noWelfareOfficerAlert, safeguardingLeadEmail, squadAlert } from './alert';
import { activeLeadEmails } from './lead';
import { ageVerificationEnabled } from './flag';
import { acceptedAgePass } from './provider';
import { PLAYER_DOB_HOLD, ageSquadMismatch, verifiedAge } from './rules';

type Admin = SupabaseClient;

const SELECTORS = ['club_admin', 'coach'];

export async function canManageSquad(admin: Admin, userId: string, clubId: string): Promise<boolean> {
  const { data, error } = await admin.from('club_members').select('id')
    .eq('user_id', userId).eq('club_id', clubId).eq('is_active', true).in('role', SELECTORS).limit(1);
  if (error) {
    console.error('[age-verification] could not check squad permission');
    return false;
  }
  return (data ?? []).length > 0;
}

/** An open squad flag blocks every squad action for that player at that club. */
export async function openSquadHold(admin: Admin, clubId: string, userIds: string[]): Promise<string | null> {
  if (!ageVerificationEnabled() || userIds.length === 0) return null;
  const { data, error } = await admin.from('age_squad_mismatches').select('id')
    .eq('club_id', clubId).in('user_id', userIds).is('resolved_at', null).limit(1);
  if (error) {
    console.error('[age-verification] could not read open squad flags');
    return PLAYER_DOB_HOLD;
  }
  return (data ?? []).length > 0 ? PLAYER_DOB_HOLD : null;
}

type Refused = { userId: string; name: string; reason: 'mismatch' | 'unverified'; flagId?: string; raisedAt?: string };

/**
 * Call this only after canManageSquad. It reads verification for the named players and, when
 * someone cannot be added, writes a safeguarding incident and a flag. Save and email failures
 * are returned, not ignored.
 */
export async function guardSquad(admin: Admin, input: { clubId: string; actorId: string; userIds: string[]; ageGroup: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ageVerificationEnabled() || input.userIds.length === 0) return { ok: true };
  const already = await openSquadHold(admin, input.clubId, input.userIds);
  if (already) return { ok: false, error: already };

  const [{ data: profiles, error: profileError }, { data: members, error: memberError }, { data: checks, error: checkError }, { data: consents, error: consentError }, { data: links, error: linkError }] = await Promise.all([
    admin.from('profiles').select('id, full_name, display_name, date_of_birth, dob_confirmed_by, dob_confirmed_at, dob_confirmation_method').in('id', input.userIds),
    admin.from('club_members').select('user_id, is_junior').eq('club_id', input.clubId).eq('is_active', true).in('user_id', input.userIds),
    admin.from('age_verifications').select('user_id, status, provider').in('user_id', input.userIds),
    admin.from('guardian_consents').select('user_id, confirmed_at').in('user_id', input.userIds),
    admin.from('child_profiles').select('linked_user_id, parent_child_links!inner(parent_id, verified_at)').in('linked_user_id', input.userIds),
  ]);
  const readError = profileError || memberError || checkError || consentError || linkError;
  if (readError) {
    console.error('[age-verification] could not read squad verification');
    return { ok: false, error: 'Could not check this squad. Nothing was saved.' };
  }

  const parentIds = new Set<string>();
  const parentsByChild = new Map<string, string[]>();
  for (const link of links ?? []) {
    const child = link.linked_user_id as string;
    const rows = Array.isArray(link.parent_child_links) ? link.parent_child_links : [link.parent_child_links];
    for (const row of rows) {
      if (!row || !(row as { verified_at?: string | null }).verified_at) continue;
      const parentId = (row as { parent_id: string }).parent_id;
      parentIds.add(parentId);
      parentsByChild.set(child, [...(parentsByChild.get(child) ?? []), parentId]);
    }
  }
  const { data: parents, error: parentError } = parentIds.size
    ? await admin.from('profiles').select('id, dob_confirmed_by, dob_confirmed_at, dob_confirmation_method').in('id', [...parentIds])
    : { data: [], error: null };
  if (parentError) {
    console.error('[age-verification] could not read guardian verification');
    return { ok: false, error: 'Could not check this squad. Nothing was saved.' };
  }
  const verifiedGuardianIds = new Set((parents ?? []).filter((parent) => parent.dob_confirmed_by && parent.dob_confirmed_at && parent.dob_confirmation_method).map((parent) => parent.id as string));

  const refused: Refused[] = [];
  for (const userId of input.userIds) {
    const profile = (profiles ?? []).find((row) => row.id === userId);
    const membership = (members ?? []).filter((row) => row.user_id === userId);
    const clubJunior = membership.length > 0 && membership.every((row) => row.is_junior === true);
    const dob = (profile?.date_of_birth as string | null) ?? null;
    const confirmed = !!(profile?.dob_confirmed_by && profile?.dob_confirmed_at && profile?.dob_confirmation_method);
    const consent = (consents ?? []).find((row) => row.user_id === userId);
    const passed = (checks ?? []).some((row) => row.user_id === userId && acceptedAgePass(row));
    const childParents = parentsByChild.get(userId) ?? [];
    const state = verifiedAge({
      clubJunior,
      dob,
      hasVerifiedParent: childParents.length > 0,
      dobConfirmed: confirmed,
      guardianConsented: !!consent?.confirmed_at,
      thirdPartyPassed: passed,
      guardianVerified: childParents.some((id) => verifiedGuardianIds.has(id)),
      hasClub: true,
    });
    const mismatch = ageSquadMismatch({ age: ageOn(dob), clubJunior, ageGroup: input.ageGroup });
    if (!mismatch && state.status !== 'unverified' && state.status !== 'needs_dob' && state.status !== 'needs_guardian') continue;
    refused.push({
      userId,
      name: (profile?.display_name as string | null) || (profile?.full_name as string | null) || 'A player',
      reason: mismatch ? 'mismatch' : 'unverified',
    });
  }
  if (refused.length === 0) return { ok: true };

  for (const row of refused) {
    const { data: incident, error: incidentError } = await admin.from('safeguarding_incidents').insert({
      club_id: input.clubId,
      reported_by: input.actorId,
      severity: 'medium',
      status: 'reported',
      category: 'welfare_concern',
      description: `${row.name} was not added to the ${input.ageGroup} squad (${row.reason === 'mismatch' ? 'age band does not match' : 'date of birth is not confirmed'}). No date of birth is stored here.`,
      is_confidential: true,
    }).select('id').single();
    if (incidentError || !incident) {
      console.error('[age-verification] could not save the safeguarding incident');
      return { ok: false, error: 'Could not record the safeguarding flag. The squad was not changed.' };
    }
    const { data: flagRow, error: flagError } = await admin.from('age_squad_mismatches').insert({
      club_id: input.clubId,
      user_id: row.userId,
      age_group: input.ageGroup,
      reason: row.reason,
      incident_id: incident.id,
    }).select('id, created_at').single();
    if (flagRow) { row.flagId = flagRow.id as string; row.raisedAt = (flagRow.created_at as string | undefined) ?? new Date().toISOString(); }
    if (flagError) {
      console.error('[age-verification] could not save the squad flag');
      return { ok: false, error: 'Could not record the safeguarding flag. The squad was not changed.' };
    }
  }

  const alertError = await notifySquad(admin, input.clubId, input.ageGroup, refused);
  if (alertError) return { ok: false, error: alertError };
  return { ok: false, error: PLAYER_DOB_HOLD };
}

async function notifySquad(admin: Admin, clubId: string, ageGroup: string, refused: Refused[]): Promise<string | null> {
  const lead = safeguardingLeadEmail();
  const { data: welfare, error } = await admin.from('club_members').select('user_id').eq('club_id', clubId).eq('is_active', true).eq('role', 'welfare_officer');
  if (error) {
    console.error('[age-verification] could not look up the welfare officer');
    return 'The player was not added, and the club welfare officer could not be looked up.';
  }
  const { data: club } = await admin.from('clubs').select('name').eq('id', clubId).maybeSingle();
  const clubName = ((club as { name?: string } | null)?.name) || 'this club';
  const ids = (welfare ?? []).map((row) => row.user_id as string);
  const noOfficer = ids.length === 0;
  // The environment address is an extra copy only. The people who act are the welfare officer, or the active leads.
  const emails = new Set<string>([lead]);
  if (noOfficer) {
    const leads = await activeLeadEmails(admin);
    if ('error' in leads) {
      console.error('[age-verification] could not look up the safeguarding leads');
      return 'The player was not added, and the safeguarding alert could not be sent.';
    }
    for (const email of leads.emails) emails.add(email);
  } else {
    const { data: profiles, error: profileError } = await admin.from('profiles').select('email').in('id', ids);
    if (profileError) {
      console.error('[age-verification] could not read welfare officer email');
      return 'The player was not added, and the safeguarding alert could not be sent.';
    }
    for (const profile of profiles ?? []) if (profile.email) emails.add(profile.email as string);
  }
  let openAtClub: number | undefined;
  if (noOfficer) {
    const { data: open } = await admin.from('age_squad_mismatches').select('id').eq('club_id', clubId).is('resolved_at', null);
    openAtClub = (open ?? []).length;
  }
  for (const row of refused) {
    const message = noOfficer
      ? noWelfareOfficerAlert({ clubName, playerName: row.name, ageGroup, reason: row.reason, flagId: row.flagId, raisedAt: row.raisedAt ?? new Date().toISOString(), openFlagsAtClub: openAtClub })
      : squadAlert({ playerName: row.name, ageGroup, reason: row.reason, clubName });
    for (const to of emails) {
      const sent = await sendEmail({ to, subject: message.subject, text: message.text });
      if (!sent) {
        console.error('[age-verification] safeguarding email was not sent');
        return 'The player was not added, and the safeguarding alert could not be sent.';
      }
    }
  }
  return null;
}
