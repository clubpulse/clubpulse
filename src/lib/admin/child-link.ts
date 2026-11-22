// Club admins link a child record to the child's own ShiftUp account, which is what lets the Community treat the
// account as a junior and tell the child's parents about new connections. Service role; callers must already have
// resolved the caller's admin clubs (getAdminContext).

import { createAdminClient } from '@/lib/supabase/admin';
import { dbsIsCurrent, type DbsRow } from '@/lib/community/rules';
import { ukToday } from '@/lib/utils/uk-date';

export type LinkResult = { success: true; name: string } | { success: false; error: string };

function ageOn(dob: string, today = new Date()): number {
  const b = new Date(dob);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

async function ownChild(adminClubIds: string[], childId: unknown) {
  if (typeof childId !== 'string') return null;
  const { data } = await createAdminClient().from('child_profiles').select('id, club_id, first_name, date_of_birth, linked_user_id').eq('id', childId).maybeSingle();
  // An admin can only act on children of a club they administer
  return data && adminClubIds.includes(data.club_id as string) ? data : null;
}

/**
 * Of the clubs this person administers, the ones where they hold a current enhanced DBS check. Linking a child's
 * record to an account is what makes the account a junior, so it is limited to admins who are checked.
 */
export async function clubsWithCurrentDbs(userId: string, adminClubIds: string[]): Promise<string[]> {
  if (adminClubIds.length === 0) return [];
  const { data } = await createAdminClient().from('dbs_checks').select('club_id, check_type, status, expiry_date').eq('user_id', userId).in('club_id', adminClubIds);
  const today = ukToday();
  return adminClubIds.filter((c) => dbsIsCurrent((data ?? []).filter((d) => d.club_id === c) as DbsRow[], today));
}

export async function linkChildToAccount(adminClubIds: string[], childId: unknown, email: unknown): Promise<LinkResult> {
  const child = await ownChild(adminClubIds, childId);
  if (!child) return { success: false, error: 'Child record not found.' };
  if (typeof email !== 'string' || !email.includes('@')) return { success: false, error: 'Enter the email address the child signed up with.' };
  if (ageOn(child.date_of_birth as string) >= 18) return { success: false, error: 'This child record is for someone aged 18 or over, so it cannot be linked as a junior account.' };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, full_name, display_name').ilike('email', email.trim()).maybeSingle();
  // The same message whether the email is unknown or belongs to someone outside this club
  const notFound: LinkResult = { success: false, error: 'No member of this club has that email address.' };
  if (!profile) return notFound;
  const { data: member } = await admin.from('club_members').select('id').eq('club_id', child.club_id as string).eq('user_id', profile.id as string).eq('is_active', true).limit(1);
  if ((member ?? []).length === 0) return notFound;

  const { data: taken } = await admin.from('child_profiles').select('id').eq('linked_user_id', profile.id as string).neq('id', child.id as string).limit(1);
  if ((taken ?? []).length > 0) return { success: false, error: 'That account is already linked to another child record.' };

  const { error } = await admin.from('child_profiles').update({ linked_user_id: profile.id as string }).eq('id', child.id as string);
  if (error) return { success: false, error: 'Could not link the account.' };
  // A child record is under 18 by definition, so the member is a junior in this club
  await admin.from('club_members').update({ is_junior: true }).eq('club_id', child.club_id as string).eq('user_id', profile.id as string);
  return { success: true, name: (profile.display_name as string | null) || (profile.full_name as string | null) || 'Member' };
}

export async function unlinkChildAccount(adminClubIds: string[], childId: unknown): Promise<LinkResult> {
  const child = await ownChild(adminClubIds, childId);
  if (!child) return { success: false, error: 'Child record not found.' };
  const { error } = await createAdminClient().from('child_profiles').update({ linked_user_id: null }).eq('id', child.id as string);
  if (error) return { success: false, error: 'Could not unlink the account.' };
  return { success: true, name: child.first_name as string };
}
