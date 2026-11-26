'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/server';

const ROLE = /^[a-z_]{2,40}$/;

/** Changes a member's role or junior mark. The database checks the caller and writes the audit row. */
export async function setClubMemberStanding(memberId: string, role: string, isJunior: boolean): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  if (!ROLE.test(role) || typeof isJunior !== 'boolean') return { success: false, error: 'That role is not valid.' };
  const { error } = await createAdminClient().rpc('set_club_member_standing', {
    p_member: memberId,
    p_role: role,
    p_junior: isJunior,
    p_actor: user.id,
  });
  if (error) return { success: false, error: 'Could not update that member.' };
  revalidatePath('/admin/club/members');
  return { success: true };
}
