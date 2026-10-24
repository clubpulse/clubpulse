import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { adminGetAllLegacies } from '@/lib/actions/legacy';
import { AdminLegacyPanel } from '@/components/legacy/AdminLegacyPanel';

export default async function AlumniAdminPage() {
  const { clubId } = await requireClubAdminPage();
  const result = await adminGetAllLegacies(clubId);
  if (!result.success) {
    return <p style={{ fontSize: 13, color: '#f87171', fontFamily: "'Inter', sans-serif" }}>{result.error}</p>;
  }
  return <AdminLegacyPanel clubId={clubId} initialLegacies={result.data} />;
}
