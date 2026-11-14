import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getScoresAdmin } from '@/lib/actions/scores-engine';
import { getAttendanceAdmin } from '@/lib/actions/attendance';
import { ScoresRulesPanel } from '@/components/scores-admin/ScoresRulesPanel';
import { h1, muted } from '@/components/play/ui';

export default async function AdminScoresRulesPage() {
  const { clubId } = await requireClubAdminPage();
  const [scores, attendance] = await Promise.all([getScoresAdmin(clubId), getAttendanceAdmin(clubId)]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>🎛️ Scores controls</h1>
        <p style={muted}>Set what check-ins, challenges, games and club duties pay, switch them on or off, and cap what a player can earn each week</p>
      </div>
      {scores.success ? (
        <ScoresRulesPanel
          clubId={clubId}
          rules={scores.data.rules}
          settings={scores.data.settings}
          members={attendance.success ? attendance.data.members : []}
        />
      ) : (
        <p style={{ fontSize: '14px', color: '#f87171', margin: 0 }}>{scores.error}</p>
      )}
    </div>
  );
}
