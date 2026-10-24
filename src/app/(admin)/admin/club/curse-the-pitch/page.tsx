import { requireClubAdminPage } from '@/lib/auth/admin-page';
import {
  getUpcomingFixturesForVote,
  getPitchVoteAggregates,
  getGroundHistory,
} from '@/lib/actions/pitch';
import { PITCH_CONFIG, type PitchCondition, type PitchVoteAggregate, type GroundHistory } from '@/lib/types/pitch';
import { AdminResolvePanel } from '@/components/pitch/AdminResolvePanel';
import type { UpcomingFixture } from '@/lib/actions/pitch';

export default async function AdminCurseThePitchPage() {
  const { clubId } = await requireClubAdminPage();

  const [fixturesResult, groundHistoryResult] = await Promise.all([
    getUpcomingFixturesForVote(clubId),
    getGroundHistory(clubId),
  ]);

  const fixtures = fixturesResult.success ? fixturesResult.data : [];
  const groundHistory = groundHistoryResult.success ? groundHistoryResult.data : [];

  // Load vote aggregates for each fixture
  const aggregatesPerFixture: Record<string, PitchVoteAggregate[]> = {};
  await Promise.all(
    fixtures.map(async (f) => {
      const r = await getPitchVoteAggregates(f.id);
      if (r.success) aggregatesPerFixture[f.id] = r.data;
    })
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
          🌀 Curse the Pitch — Admin
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Resolve pitch conditions after each match to award Scores to correct predictors.
        </p>
      </div>

      {/* Pending fixtures */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
          Pending fixtures
        </h2>

        {fixtures.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>No fixtures awaiting resolution.</p>
        ) : (
          fixtures.map((fixture) => {
            const aggregates = aggregatesPerFixture[fixture.id] ?? [];
            const totalVotes = aggregates.reduce((s, a) => s + a.count, 0);
            return (
              <div key={fixture.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                    vs {fixture.opponent}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(fixture.match_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {fixture.venue ? ` · ${fixture.venue}` : ''}
                    {' · '}{totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Vote breakdown */}
                {aggregates.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {aggregates.sort((a, b) => b.count - a.count).map((agg) => {
                      const cfg = PITCH_CONFIG[agg.condition];
                      return (
                        <div key={agg.condition} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', width: '18px' }}>{cfg.emoji}</span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', width: '48px' }}>{cfg.label}</span>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${agg.percent}%`, height: '100%', background: 'rgba(155,28,28,0.7)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', width: '48px', textAlign: 'right' }}>
                            {agg.count} ({agg.percent}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Resolve panel (client component) */}
                <AdminResolvePanel fixtureId={fixture.id} />
              </div>
            );
          })
        )}
      </section>

      {/* Ground history */}
      {groundHistory.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
            Ground history
          </h2>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Condition', 'Times', 'Last seen'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groundHistory.map((h, i) => {
                  const cfg = PITCH_CONFIG[h.condition];
                  return (
                    <tr key={h.condition}>
                      <td style={{ padding: '10px 16px', color: '#fff', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                        {cfg.emoji} {cfg.label}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.6)', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                        {h.times}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.45)', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                        {new Date(h.last_seen).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
