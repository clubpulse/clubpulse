'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/server';
import { createHash, randomBytes } from 'crypto';
import { ageOn, isPlausibleDob } from '@/lib/community/age';
import { sendEmail } from '@/lib/email/resend';

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
  if (age !== null && age < 13) {
    const token = randomBytes(32).toString('hex');
    const token_hash = createHash('sha256').update(token).digest('hex');
    const { error: consentError } = await admin.from('guardian_consents').upsert({
      user_id: user.id,
      guardian_email: email,
      token_hash,
      confirmed_at: null,
    });
    if (consentError) return { success: false, error: 'Your date of birth was saved, but the guardian confirmation could not be stored yet.' };
    const site = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.shiftup.club';
    await sendEmail({
      to: email,
      subject: 'Confirm a SHIFTUP account for someone under 13',
      text: `Someone under 13 has asked you to confirm their SHIFTUP account.\n\nOpen this link if you are their parent or guardian and you agree:\n${site}/api/account/guardian-consent?token=${token}\n\nIf this was not you, ignore this email.`,
    });
  }
  revalidatePath('/', 'layout');
  return { success: true };
}
