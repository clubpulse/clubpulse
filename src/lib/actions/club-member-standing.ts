'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { changeMemberStanding } from '@/lib/admin/member-standing';

/** The checked way to change a member's role or junior mark. Needs a reason, writes an audit row. */
export async function setClubMemberStanding(
  memberId: string,
  role: string,
  isJunior: boolean,
  reason: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  const result = await changeMemberStanding({ actorId: user.id }, memberId, role, isJunior, reason, 'club_admin');
  if (result.success) revalidatePath('/admin/club/members');
  return result;
}
