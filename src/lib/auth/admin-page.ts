import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';

// For (admin) pages that need a club. Uses the user's first admin club.
export async function requireClubAdminPage() {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (ctx.adminClubIds.length === 0) redirect('/dashboard');
  return { user, clubId: ctx.adminClubIds[0], ctx };
}
