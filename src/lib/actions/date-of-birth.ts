'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/server';
import { ageOn, isPlausibleDob } from '@/lib/community/age';
import { requestGuardianConsent } from '@/lib/community/guardian-consent';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DobResult = { success: true } | { success: false; error: string };

/**
 * Saves the signed-in person's date of birth, once. It is only written when none is on file, so it cannot be
 * changed afterwards to move out of the junior rules; a mistake is corrected by SHIFTUP staff.
 */
export async function saveDateOfBirth(dob: unknown, guardianEmail?: unknown): Promise<DobResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Please sign in again.' };
  if (!isPlausibleDob(dob)) return { success: false, error: 'Enter your date of birth as a real date.' };
  const age = ageOn(dob);
  const email = typeof guardianEmail === 'string' ? guardianEmail.trim().toLowerCase() : '';
  if (age !== null && age < 13 && !EMAIL.test(email)) {
    return { success: false, error: 'Under 13s need a parent or guardian email address.' };
  }
  const admin = createAdminClient();
  const { data: row } = await admin.from('profiles').select('date_of_birth').eq('id', user.id).maybeSingle();
  if (row?.date_of_birth) return { success: false, error: 'Your date of birth is already saved. Contact SHIFTUP if it is wrong.' };
  const { error } = await admin.from('profiles').update({ date_of_birth: dob }).eq('id', user.id).is('date_of_birth', null);
  if (error) return { success: false, error: 'Could not save your date of birth.' };
  revalidatePath('/', 'layout');
  if (age !== null && age < 13) {
    const sent = await requestGuardianConsent(user.id, email);
    if (!sent.success) {
      const error = sent.error === 'The guardian confirmation could not be stored yet.'
        ? 'Your date of birth was saved, but the guardian confirmation could not be stored yet.'
        : sent.error;
      return { success: false, error };
    }
  }
  return { success: true };
}
