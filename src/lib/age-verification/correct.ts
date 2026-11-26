import { createAdminClient } from '@/lib/supabase/admin';
import { hasCurrentDbsAt } from '@/lib/admin/child-link';
import { isPlausibleDob } from '@/lib/community/age';
import { ageVerificationEnabled } from './flag';

const OFFICIALS = ['club_admin', 'coach', 'welfare_officer'];

export type CorrectResult = { success: true } | { success: false; error: string };

/**
 * A club official with a current DBS check can correct a member's date of birth once. The previous
 * and new dates are written to the audit log. No document is stored. The caller is not given the
 * member's date back.
 */
export async function correctDateOfBirth(officialId: string, clubId: unknown, memberId: unknown, nextDob: unknown, reason: unknown): Promise<CorrectResult> {
  if (!ageVerificationEnabled()) return { success: false, error: 'Date of birth correction is not open yet.' };
  if (typeof clubId !== 'string' || typeof memberId !== 'string') return { success: false, error: 'Member not found.' };
  if (memberId === officialId) return { success: false, error: 'You cannot correct your own date of birth.' };
  if (!isPlausibleDob(nextDob)) return { success: false, error: 'Enter the date of birth as a real date.' };
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (why.length < 3 || why.length > 200) return { success: false, error: 'Add a short reason. Do not enter a document number.' };
  if (/\d{6,}/.test(why)) return { success: false, error: 'Do not enter a document number.' };
  const admin = createAdminClient();
  const { data: mine } = await admin.from('club_members').select('club_id, role').eq('user_id', officialId).eq('club_id', clubId).eq('is_active', true).in('role', OFFICIALS).limit(1);
  if (!mine || mine.length === 0) return { success: false, error: 'Only a club admin, coach or welfare officer can correct a date of birth.' };
  if (!(await hasCurrentDbsAt(officialId, clubId))) return { success: false, error: 'You need a current enhanced DBS check at this club before you can correct a date of birth.' };
  const { data: member } = await admin.from('club_members').select('user_id').eq('user_id', memberId).eq('club_id', clubId).eq('is_active', true).limit(1);
  if (!member || member.length === 0) return { success: false, error: 'Member not found.' };
  const { data: profile } = await admin.from('profiles').select('date_of_birth').eq('id', memberId).maybeSingle();
  const previous = (profile?.date_of_birth as string | null) ?? null;
  if (previous === nextDob) return { success: false, error: 'That date is already on the profile.' };
  const { error } = await admin.rpc('correct_date_of_birth', {
    p_member: memberId,
    p_club: clubId,
    p_official: officialId,
    p_new: nextDob,
    p_reason: why,
  });
  if (error) {
    console.error('[age-verification] date of birth correction failed');
    return { success: false, error: 'Could not correct the date of birth.' };
  }
  return { success: true };
}
