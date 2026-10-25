import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { adminGetTransferRequests } from '@/lib/actions/transfer';
import { AdminTransferClient } from './AdminTransferClient';

export default async function AdminTransferWindowPage() {
  const { clubId } = await requireClubAdminPage();
  const result = await adminGetTransferRequests(clubId);
  const requests = result.success ? result.data : [];
  const incoming = requests.filter((r: { to_club_id: string }) => r.to_club_id === clubId);
  const outgoing = requests.filter((r: { from_club_id: string }) => r.from_club_id === clubId);
  return <AdminTransferClient clubId={clubId} incoming={incoming} outgoing={outgoing} />;
}
