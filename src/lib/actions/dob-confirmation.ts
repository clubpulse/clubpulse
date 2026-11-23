'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';
import { confirmDob } from '@/lib/admin/dob-confirmation';

type R = { success: boolean; error?: string; message?: string };

/** The only way a date of birth gets confirmed. Runs as the signed-in admin; the check that they belong to the junior's club is in confirmDob. */
export async function confirmDobAction(juniorId: string, dob: string): Promise<R> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  const r = await confirmDob(user.id, ctx.adminClubIds, juniorId, dob);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/admin/club/safeguarding');
  revalidatePath('/community', 'layout');
  return { success: true, message: `Confirmed ${r.name}’s date of birth.` };
}
