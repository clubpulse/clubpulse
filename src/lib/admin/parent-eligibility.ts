// Who may be a parent or guardian on ShiftUp, and who may verify one. Service role; callers have already resolved who
// is asking. A date of birth here is declared, not proven: this stops a junior or an account with no date of birth being
// treated as a parent, not someone who lies about their age.

import { createAdminClient } from '@/lib/supabase/admin';
import { ageOn, isPlausibleDob } from '@/lib/community/age';
import { VERIFY_NEEDS_DBS, hasCurrentDbsAt } from '@/lib/admin/child-link';

export type ParentRefusal = 'no_dob' | 'bad_dob' | 'under_18' | 'junior';
export type Eligibility = { ok: true } | { ok: false; reason: ParentRefusal };

/**
 * An adult by the Community's own rule: a real date of birth on the profile, 18 or over, and not marked a junior by the
 * club on every membership (so a junior who has typed an adult date is still refused if the club has marked them).
 * No date of birth is a refusal, never a pass.
 */
export async function parentEligibility(userId: string, now: Date = new Date()): Promise<Eligibility> {
  const admin = createAdminClient();
  const [{ data: prof }, { data: members }] = await Promise.all([
    admin.from('profiles').select('date_of_birth').eq('id', userId).limit(1),
    admin.from('club_members').select('is_junior').eq('user_id', userId).eq('is_active', true),
  ]);
  const dob = (prof ?? [])[0]?.date_of_birth as string | null | undefined;
  if (!dob) return { ok: false, reason: 'no_dob' };
  if (!isPlausibleDob(dob, now)) return { ok: false, reason: 'bad_dob' };
  if ((ageOn(dob, now) ?? 0) < 18) return { ok: false, reason: 'under_18' };
  const rows = members ?? [];
  if (rows.length > 0 && rows.every((m) => m.is_junior)) return { ok: false, reason: 'junior' };
  return { ok: true };
}

export function parentRefusalMessage(reason: ParentRefusal, audience: 'self' | 'admin'): string {
  if (audience === 'self') {
    if (reason === 'no_dob') return 'Add your date of birth to your profile before registering a child.';
    if (reason === 'bad_dob') return 'Check the date of birth on your profile, then try again.';
    return 'Only an adult aged 18 or over can register a child as a parent or guardian.';
  }
  if (reason === 'no_dob') return 'This parent’s account has no date of birth, so they cannot be verified yet. Ask them to add it to their profile.';
  if (reason === 'bad_dob') return 'The date of birth on this parent’s account is not valid, so they cannot be verified. Ask them to correct it.';
  return 'This account belongs to someone under 18, or one the club has marked as a junior, so it cannot be verified as a parent or guardian.';
}

/**
 * Everything that must hold before an admin verifies a parent link: the admin holds a current enhanced DBS check at the
 * child's club, and the parent's account is an adult. Returns an error message, or null to go ahead.
 */
export async function verifyParentGate(adminId: string, clubId: string, parentId: string): Promise<string | null> {
  if (!(await hasCurrentDbsAt(adminId, clubId))) return VERIFY_NEEDS_DBS;
  const e = await parentEligibility(parentId);
  return e.ok ? null : parentRefusalMessage(e.reason, 'admin');
}
