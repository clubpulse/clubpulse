import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { adminGetPendingFixtures } from '@/lib/actions/gut-feeling';
import { AdminResolveList } from '@/components/gut-feeling/AdminResolveList';

export default async function AdminGutFeelingPage() {
  const { clubId } = await requireClubAdminPage();
  const result = await adminGetPendingFixtures(clubId);

  const fixtures = result.success ? result.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          ⚡ Gut Feeling — Resolve Fixtures
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Enter the actual result for each fixture to score predictions and award Scores to correct callers.
        </p>
      </div>

      {!result.success && (
        <p style={{ fontSize: '13px', color: '#f87171' }}>{result.error}</p>
      )}

      <AdminResolveList fixtures={fixtures} />
    </div>
  );
}
