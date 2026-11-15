import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listCoaches, getCoachingAnalytics } from '@/lib/admin/coach-service';
import { CoachList } from '@/components/club/CoachList';
import { h1, muted, card, cardTitle } from '@/components/play/ui';
import { formatScores } from '@/lib/utils/format';

export default async function CoachManagementPage() {
  const { user, clubId } = await requireClubAdminPage();
  const [coachesRes, analyticsRes] = await Promise.all([
    listCoaches(user.id, clubId),
    getCoachingAnalytics(user.id, clubId),
  ]);

  if (!coachesRes.success) {
    return (
      <p style={{ fontSize: '14px', color: '#f87171' }}>
        Couldn&apos;t load coaches: {coachesRes.error}
      </p>
    );
  }

  const analytics = analyticsRes.success ? analyticsRes.data : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>🎓 Coach management</h1>
        <p style={muted}>Approve coaches, verify certifications, and track performance</p>
      </div>

      {/* Analytics tiles */}
      {analytics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          {[
            { label: 'Active coaches', value: analytics.approvedCoaches },
            { label: 'Pending approval', value: analytics.pendingApproval, warn: analytics.pendingApproval > 0 },
            { label: 'Sessions completed', value: analytics.completedSessions },
            { label: 'Avg rating', value: analytics.avgRating ? `⭐ ${analytics.avgRating}` : '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: '#07102B',
                border: `1px solid ${stat.warn ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <p
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: 'rgba(255,255,255,0.3)',
                  margin: '0 0 6px',
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: '20px',
                  color: stat.warn ? '#fde047' : '#fff',
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Extra stats row */}
      {analytics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}
        >
          <div style={card}>
            <p style={cardTitle}>Scores flowed</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, color: '#EFC84A', fontSize: '18px' }}>
              {formatScores(analytics.totalScoresFlowed)}
            </p>
          </div>
          <div style={card}>
            <p style={cardTitle}>Total sessions</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, color: '#fff', fontSize: '18px' }}>
              {analytics.totalSessions}
            </p>
          </div>
          <div style={card}>
            <p style={cardTitle}>Expiring certs (30d)</p>
            <p
              style={{
                margin: '6px 0 0',
                fontWeight: 700,
                color: analytics.expiringCerts > 0 ? '#f87171' : '#4ade80',
                fontSize: '18px',
              }}
            >
              {analytics.expiringCerts}
            </p>
          </div>
        </div>
      )}

      {/* Coach list with approve/reject */}
      <CoachList clubId={clubId} coaches={coachesRes.data} />
    </div>
  );
}
