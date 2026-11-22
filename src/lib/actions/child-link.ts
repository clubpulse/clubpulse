'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';
import { linkChildToAccount, unlinkChildAccount } from '@/lib/admin/child-link';

type R = { success: boolean; error?: string; message?: string };

async function adminClubs(): Promise<string[]> {
  const user = await requireUser();
  return (await getAdminContext(user.id)).adminClubIds;
}

export async function linkChildAccountAction(childId: string, email: string): Promise<R> {
  const clubs = await adminClubs();
  if (clubs.length === 0) return { success: false, error: 'Only a club admin can do this.' };
  const r = await linkChildToAccount(clubs, childId, email);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/admin/club/safeguarding');
  return { success: true, message: `Linked to ${r.name}'s account.` };
}

export async function unlinkChildAccountAction(childId: string): Promise<R> {
  const clubs = await adminClubs();
  if (clubs.length === 0) return { success: false, error: 'Only a club admin can do this.' };
  const r = await unlinkChildAccount(clubs, childId);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/admin/club/safeguarding');
  return { success: true, message: 'Account unlinked.' };
}
