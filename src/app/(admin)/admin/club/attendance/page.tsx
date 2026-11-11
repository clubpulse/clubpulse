import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getAttendanceAdmin } from '@/lib/actions/attendance';
import { AttendancePanel } from '@/components/scores-admin/AttendancePanel';
import { h1, muted } from '@/components/play/ui';

export default async function AdminAttendancePage() {
  const { clubId } = await requireClubAdminPage();
  const result = await getAttendanceAdmin(clubId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>🏋️ Training and fees</h1>
        <p style={muted}>Mark who came to training and who has paid their match fee. Both pay Scores automatically</p>
      </div>
      {result.success
        ? <AttendancePanel clubId={clubId} data={result.data} />
        : <p style={{ fontSize: '14px', color: '#f87171', margin: 0 }}>{result.error}</p>}
    </div>
  );
}
