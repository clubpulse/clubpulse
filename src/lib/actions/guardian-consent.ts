'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/server';
import { guardianPromptFor, requestGuardianConsent, type ConsentResult } from '@/lib/community/guardian-consent';

/** The signed-in under-13 sends or corrects the guardian email. Hidden once a verified parent or a confirmation exists. */
export async function resendGuardianConsent(email: unknown): Promise<ConsentResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Please sign in again.' };
  const prompt = await guardianPromptFor(user.id);
  if (!prompt.show) return { success: false, error: 'This account does not need a guardian confirmation.' };
  const result = await requestGuardianConsent(user.id, email);
  if (result.success) revalidatePath('/', 'layout');
  return result;
}
