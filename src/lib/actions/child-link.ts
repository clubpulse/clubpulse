'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';
import { clubsWithCurrentDbs, linkChildToAccount, unlinkChildAccount } from '@/lib/admin/child-link';

type R = { success: boolean; error?: string; message?: string };

async function adminClubs(): Promise<{ userId: string; clubs: string[] }> {
  const user = await requireUser();
  return { userId: user.id, clubs: (await getAdminContext(user.id)).adminClubIds };
}

export async function linkChildAccountAction(childId: string, email: string): Promise<R> {
  const { userId, clubs: adminOf } = await adminClubs();
  if (adminOf.length === 0) return { success: false, error: 'Only a club admin can do this.' };
  // Linking makes an account a junior, so only an admin with a current enhanced DBS check recorded at the club may do it
  const clubs = await clubsWithCurrentDbs(userId, adminOf);
  if (clubs.length === 0) return { success: false, error: 'Linking a child to an account needs a current enhanced DBS check recorded for you at this club. Ask SHIFTUP to record yours.' };
  const r = await linkChildToAccount(clubs, childId, email);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/admin/club/safeguarding');
  return { success: true, message: `Linked to ${r.name}'s account.` };
}

export async function unlinkChildAccountAction(childId: string): Promise<R> {
  // Unlinking is open to any club admin: it removes a child's route into the Community, so it only makes things safer
  const { clubs } = await adminClubs();
  if (clubs.length === 0) return { success: false, error: 'Only a club admin can do this.' };
  const r = await unlinkChildAccount(clubs, childId);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/admin/club/safeguarding');
  return { success: true, message: 'Account unlinked.' };
}
