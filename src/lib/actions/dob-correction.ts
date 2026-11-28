'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { correctDateOfBirth } from '@/lib/age-verification/correct';

export async function correctDobAction(clubId: string, memberId: string, dob: string, reason: string): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  const result = await correctDateOfBirth(user.id, clubId, memberId, dob, reason);
  if (!result.success) return result;
  revalidatePath('/admin/club/safeguarding');
  return { success: true };
}
