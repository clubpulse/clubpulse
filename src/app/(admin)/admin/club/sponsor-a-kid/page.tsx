import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { AdminSponsorShell } from '@/components/sponsor/AdminSponsorShell';

export default async function AdminSponsorPage() {
  const { clubId } = await requireClubAdminPage();
  return <AdminSponsorShell clubId={clubId} />;
}
