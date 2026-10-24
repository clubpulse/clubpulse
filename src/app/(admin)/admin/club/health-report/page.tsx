import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubHealthMetrics, getClubHealthSnapshots } from '@/lib/actions/club-health';
import { HealthKPIGrid } from '@/components/club-health/HealthKPIGrid';
import { HealthTrendChart } from '@/components/club-health/HealthTrendChart';
import { SaveSnapshotButton } from '@/components/club-health/SaveSnapshotButton';
import { PrintButton } from '@/components/club-health/PrintButton';
import type { ClubHealthMetrics } from '@/lib/types/club-health';

export const metadata = { title: 'Club Health Report' };

export default async function ClubHealthReportPage() {
  const { clubId } = await requireClubAdminPage();

  const [metricsResult, snapshotsResult] = await Promise.all([
    getClubHealthMetrics(clubId),
    getClubHealthSnapshots(clubId),
  ]);

  const now = new Date();
  const lastUpdated = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const metrics: ClubHealthMetrics | null = metricsResult.success ? metricsResult.data : null;
  const snapshots = snapshotsResult.success ? snapshotsResult.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '26px',
            color: '#fff',
            margin: '0 0 4px',
            letterSpacing: '-0.4px',
          }}>
            📊 Club Health Report
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Last updated: {lastUpdated}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SaveSnapshotButton clubId={clubId} />
          <PrintButton />
        </div>
      </div>

      {/* Error state */}
      {!metricsResult.success && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '12px',
          padding: '16px',
          color: '#f87171',
          fontSize: '14px',
        }}>
          Could not load club health data: {metricsResult.error}
        </div>
      )}

      {/* KPI Grid */}
      {metrics && <HealthKPIGrid metrics={metrics} />}

      {/* Trend Chart */}
      <div>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '16px',
          color: '#fff',
          margin: '0 0 16px',
          letterSpacing: '-0.2px',
        }}>
          Monthly trends
        </h2>
        <HealthTrendChart snapshots={snapshots} />
      </div>

      {/* Legend */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        padding: '16px 20px',
      }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
          Status thresholds
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { metric: 'Availability rate', good: '>70%', watch: '40–70%', alert: '<40%' },
            { metric: 'Active injuries', good: '0', watch: '1–2', alert: '3+' },
          ].map((row) => (
            <div key={row.metric} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{row.metric}: </span>
              <span style={{ color: '#34d399' }}>● {row.good} Healthy</span>
              {' · '}
              <span style={{ color: '#f59e0b' }}>● {row.watch} Watch</span>
              {' · '}
              <span style={{ color: '#f87171' }}>● {row.alert} Alert</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
