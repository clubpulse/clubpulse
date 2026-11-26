'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { resolveSquadFlag } from '@/lib/age-verification/flags';

export async function resolveSquadFlagAction(clubId: string, flagId: string): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  const result = await resolveSquadFlag(user.id, clubId, flagId);
  if (!result.success) return result;
  revalidatePath('/admin/club/safeguarding');
  return { success: true };
}
