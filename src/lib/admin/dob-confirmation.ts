// A club admin confirms a junior member's date of birth. Service role, and the only writer of dob_confirmed_by and
// dob_confirmed_at (migration 026 stops every client role from setting them). The date is still one the family gave, so
// "confirmed" means a club admin has checked it against something they hold, such as the registration form or a passport
// they were shown; it is not a document check by SHIFTUP.

import { createAdminClient } from '@/lib/supabase/admin';
import { ageOn, isPlausibleDob } from '@/lib/community/age';
import { hasCurrentDbsAt } from '@/lib/admin/child-link';
import { ageVerificationEnabled } from '@/lib/age-verification/flag';
import { isDobMethod, type DobMethod } from '@/lib/age-verification/rules';

export type DobCandidate = { userId: string; name: string; dob: string; age: number; clubId: string; markedJunior: boolean };
export type DobConfirmResult = { success: true; name: string } | { success: false; error: string };

type Member = { user_id: string; club_id: string; role: string; is_junior: boolean };

/** Is this person a junior by the Community's own rule? Marked on every active membership, or under 18 by date of birth. */
const isJunior = (rows: Member[], dob: string | null) => (rows.length > 0 && rows.every((m) => m.is_junior === true)) || (dob !== null && (ageOn(dob) ?? 99) < 18);

/** Junior members of these clubs whose date of birth no admin has confirmed yet, youngest first. */
export async function listDobToConfirm(clubIds: string[], limit = 200): Promise<{ items: DobCandidate[]; confirmed: number; error?: string }> {
  if (clubIds.length === 0) return { items: [], confirmed: 0 };
  const admin = createAdminClient();
  const { data: members, error: mErr } = await admin.from('club_members').select('user_id, club_id, role, is_junior').in('club_id', clubIds).eq('is_active', true).limit(2000);
  if (mErr) return { items: [], confirmed: 0, error: 'Could not load members.' };
  const ids = [...new Set((members ?? []).map((m) => m.user_id as string))];
  if (ids.length === 0) return { items: [], confirmed: 0 };
  const { data: profs, error: pErr } = await admin.from('profiles').select('id, full_name, display_name, date_of_birth, dob_confirmed_by, dob_confirmed_at, dob_confirmation_method').in('id', ids);
  if (pErr) return { items: [], confirmed: 0, error: 'Could not load dates of birth. If this keeps happening, the latest database update has not been applied yet.' };
  const items: DobCandidate[] = []; let confirmed = 0;
  for (const p of (profs ?? []) as Array<Record<string, string | null>>) {
    const mine = (members ?? []).filter((m) => m.user_id === p.id) as Member[];
    const dob = p.date_of_birth ?? null;
    if (!ageVerificationEnabled() && !isJunior(mine, dob)) continue;
    const confirmedRow = ageVerificationEnabled()
      ? !!(p.dob_confirmed_by && p.dob_confirmed_at && p.dob_confirmation_method)
      : !!(p.dob_confirmed_by && p.dob_confirmed_at);
    if (confirmedRow) { confirmed++; continue; }
    if (!dob || !isPlausibleDob(dob)) continue; // nothing to confirm until a real date is on the profile
    items.push({ userId: p.id as string, name: (p.display_name || p.full_name || 'Member') as string, dob, age: ageOn(dob) ?? 0, clubId: mine[0].club_id, markedJunior: mine.every((m) => m.is_junior) });
  }
  items.sort((a, b) => a.age - b.age || a.name.localeCompare(b.name));
  return { items: items.slice(0, limit), confirmed };
}

/**
 * Confirm one junior's date of birth. `dob` is the date the admin was looking at: if the profile has changed since, nothing
 * is confirmed. The admin must be an active club admin at a club where the junior is an active member, and cannot confirm
 * their own.
 */
export async function confirmDob(adminId: string, adminClubIds: string[], juniorId: unknown, dob: unknown, method?: unknown): Promise<DobConfirmResult> {
  if (ageVerificationEnabled()) return confirmDobWithMethod(adminId, juniorId, dob, method);
  if (typeof juniorId !== 'string' || typeof dob !== 'string') return { success: false, error: 'Member not found.' };
  if (juniorId === adminId) return { success: false, error: 'You cannot confirm your own date of birth.' };
  if (adminClubIds.length === 0) return { success: false, error: 'Only a club admin can confirm a date of birth.' };
  const admin = createAdminClient();
  // The admin's role is read again here rather than trusted from the caller
  const { data: mine } = await admin.from('club_members').select('club_id').eq('user_id', adminId).eq('role', 'club_admin').eq('is_active', true).in('club_id', adminClubIds);
  const myClubs = new Set((mine ?? []).map((m) => m.club_id as string));
  if (myClubs.size === 0) return { success: false, error: 'Only a club admin can confirm a date of birth.' };
  const { data: theirs } = await admin.from('club_members').select('user_id, club_id, role, is_junior').eq('user_id', juniorId).eq('is_active', true);
  const rows = (theirs ?? []) as Member[];
  if (!rows.some((m) => myClubs.has(m.club_id))) return { success: false, error: 'Member not found.' };
  const { data: prof } = await admin.from('profiles').select('full_name, display_name, date_of_birth').eq('id', juniorId).maybeSingle();
  const onFile = (prof?.date_of_birth as string | null | undefined) ?? null;
  if (!onFile || !isPlausibleDob(onFile)) return { success: false, error: 'This member has no valid date of birth to confirm yet.' };
  if (onFile !== dob) return { success: false, error: 'This date of birth has changed. Reload the list and check it again.' };
  if (!isJunior(rows, onFile)) return { success: false, error: 'Only a junior member’s date of birth is confirmed here.' };
  const { data: done, error } = await admin.from('profiles')
    .update({ dob_confirmed_by: adminId, dob_confirmed_at: new Date().toISOString() })
    .eq('id', juniorId).eq('date_of_birth', onFile).select('id');
  if (error || !done || done.length === 0) return { success: false, error: 'Could not confirm the date of birth.' };
  return { success: true, name: ((prof?.display_name || prof?.full_name || 'Member') as string) };
}

const OFFICIALS = ['club_admin', 'coach', 'welfare_officer'];

/** DBS-checked club staff record who, when, and how. No document number is accepted or stored. */
async function confirmDobWithMethod(officialId: string, memberId: unknown, dob: unknown, method: unknown): Promise<DobConfirmResult> {
  if (typeof memberId !== 'string' || typeof dob !== 'string') return { success: false, error: 'Member not found.' };
  if (!isDobMethod(method)) return { success: false, error: 'Say how you checked the date of birth. Do not enter a document number.' };
  if (memberId === officialId) return { success: false, error: 'You cannot confirm your own date of birth.' };
  const admin = createAdminClient();
  const { data: mine } = await admin.from('club_members').select('club_id, role').eq('user_id', officialId).eq('is_active', true).in('role', OFFICIALS);
  const clubs = [...new Set((mine ?? []).map((row) => row.club_id as string))];
  if (clubs.length === 0) return { success: false, error: 'Only a DBS-checked club admin, coach or welfare officer can confirm a date of birth.' };
  const { data: theirs } = await admin.from('club_members').select('user_id, club_id, role, is_junior').eq('user_id', memberId).eq('is_active', true);
  const shared = ((theirs ?? []) as Member[]).map((row) => row.club_id).filter((id) => clubs.includes(id));
  if (shared.length === 0) return { success: false, error: 'Member not found.' };
  let checked = false;
  for (const clubId of shared) {
    if (await hasCurrentDbsAt(officialId, clubId)) { checked = true; break; }
  }
  if (!checked) return { success: false, error: 'You need a current enhanced DBS check at this club before you can confirm a date of birth.' };
  const { data: prof } = await admin.from('profiles').select('full_name, display_name, date_of_birth').eq('id', memberId).maybeSingle();
  const onFile = (prof?.date_of_birth as string | null | undefined) ?? null;
  if (!onFile || !isPlausibleDob(onFile)) return { success: false, error: 'This member has no valid date of birth to confirm yet.' };
  if (onFile !== dob) return { success: false, error: 'This date of birth has changed. Reload the list and check it again.' };
  const { data: done, error } = await admin.from('profiles')
    .update({ dob_confirmed_by: officialId, dob_confirmed_at: new Date().toISOString(), dob_confirmation_method: method satisfies DobMethod })
    .eq('id', memberId).eq('date_of_birth', onFile).select('id');
  if (error || !done || done.length === 0) return { success: false, error: 'Could not confirm the date of birth.' };
  return { success: true, name: ((prof?.display_name || prof?.full_name || 'Member') as string) };
}
