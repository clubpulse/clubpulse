import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubFeeSettings, getClubFeeApplications } from '@/lib/actions/fee-offsets';
import { FeeSettingsForm } from '@/components/fee-offset/FeeSettingsForm';
import { FeeApplicationsTable } from '@/components/fee-offset/FeeApplicationsTable';

export default async function AdminFeeOffsetPage() {
  const { clubId } = await requireClubAdminPage();

  const [settingsRes, applicationsRes] = await Promise.all([
    getClubFeeSettings(clubId),
    getClubFeeApplications(clubId),
  ]);

  const settings = settingsRes.success ? settingsRes.data : null;
  const applications = applicationsRes.success ? applicationsRes.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          💰 Fee Offset Settings
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          Configure how members can offset their annual membership fee using Scores
        </p>
      </div>

      {/* Settings form */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '24px',
      }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 20px' }}>
          Fee settings
        </h2>
        <FeeSettingsForm clubId={clubId} initialSettings={settings} />
      </div>

      {/* Applications table */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '24px',
      }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 4px' }}>
          {new Date().getFullYear()} Applications
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          {applications.length} application{applications.length !== 1 ? 's' : ''} this season
        </p>
        <FeeApplicationsTable applications={applications} />
      </div>
    </div>
  );
}
