import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getWellbeingAggregate } from '@/lib/actions/wellbeing';
import type { WellbeingAggregate } from '@/lib/types/wellbeing';

export const metadata = { title: 'Squad Wellbeing · ClubPulse Admin' };

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = value >= 4 ? '#059669' : value >= 3 ? '#ca8a04' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1,
        height: '6px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', minWidth: '24px' }}>{value}</span>
    </div>
  );
}

function ConcernAlert({ week }: { week: WellbeingAggregate }) {
  const physicalPct = week.total_responses > 0 ? week.physical_concern_count / week.total_responses : 0;
  const mentalPct = week.total_responses > 0 ? week.mental_concern_count / week.total_responses : 0;

  const concerns: string[] = [];
  if (physicalPct > 0.2) concerns.push(`${week.physical_concern_count} player${week.physical_concern_count === 1 ? '' : 's'} rated physical ≤2`);
  if (mentalPct > 0.2) concerns.push(`${week.mental_concern_count} player${week.mental_concern_count === 1 ? '' : 's'} rated mental ≤2`);

  if (concerns.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(220,38,38,0.08)',
      border: '1px solid rgba(220,38,38,0.3)',
      borderRadius: '10px',
      padding: '10px 14px',
      marginTop: '8px',
    }}>
      <p style={{ margin: 0, fontSize: '12px', color: '#f87171', fontWeight: 600 }}>
        ⚠ Squad concern — {formatWeek(week.check_week)}
      </p>
      {concerns.map((c) => (
        <p key={c} style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(248,113,113,0.8)' }}>• {c} (over 20% of respondents)</p>
      ))}
    </div>
  );
}

export default async function AdminWellbeingPage() {
  const { clubId } = await requireClubAdminPage();
  const result = await getWellbeingAggregate(clubId, 4);

  return (
    <div style={{ maxWidth: '680px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          color: '#fff',
          margin: '0 0 6px',
          letterSpacing: '-0.3px',
        }}>
          Squad Wellbeing
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Anonymous group averages — last 4 weeks
        </p>
      </div>

      {/* Privacy banner */}
      <div style={{
        background: 'rgba(155,28,28,0.08)',
        border: '1px solid rgba(155,28,28,0.3)',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '24px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>🔒</span>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>These are anonymous group averages.</strong>{' '}
          No individual data is shown. Player responses are strictly private and cannot be attributed to any individual — only aggregated counts and averages are visible here.
        </p>
      </div>

      {/* Error state */}
      {!result.success && (
        <p style={{ fontSize: '13px', color: '#f87171' }}>
          {result.error === 'not_authorized'
            ? 'You need coach or admin access to view squad wellbeing.'
            : `Could not load data: ${result.error}`}
        </p>
      )}

      {/* Concern alerts */}
      {result.success && result.data.map((week) => (
        <ConcernAlert key={week.check_week} week={week} />
      ))}

      {/* Week cards */}
      {result.success && result.data.length === 0 && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '28px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '13px',
        }}>
          No check-ins submitted yet this month.
        </div>
      )}

      {result.success && result.data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: result.data.some(w => {
          const pp = w.total_responses > 0 ? w.physical_concern_count / w.total_responses : 0;
          const mp = w.total_responses > 0 ? w.mental_concern_count / w.total_responses : 0;
          return pp > 0.2 || mp > 0.2;
        }) ? '16px' : '0' }}>
          {result.data.map((week) => (
            <div key={week.check_week} style={{
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                  Week of {formatWeek(week.check_week)}
                </h3>
                <span style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}>
                  {week.total_responses} response{week.total_responses === 1 ? '' : 's'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Physical */}
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    💪 Physical avg
                  </p>
                  <RatingBar value={Number(week.avg_physical)} />
                  <div style={{ marginTop: '6px', display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#dc2626' }}>
                      {week.physical_concern_count} concern{week.physical_concern_count === 1 ? '' : 's'} (≤2)
                    </span>
                    <span style={{ fontSize: '11px', color: '#059669' }}>
                      {week.physical_good_count} good (≥4)
                    </span>
                  </div>
                </div>

                {/* Mental */}
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    🧠 Mental avg
                  </p>
                  <RatingBar value={Number(week.avg_mental)} />
                  <div style={{ marginTop: '6px', display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#dc2626' }}>
                      {week.mental_concern_count} concern{week.mental_concern_count === 1 ? '' : 's'} (≤2)
                    </span>
                    <span style={{ fontSize: '11px', color: '#059669' }}>
                      {week.mental_good_count} good (≥4)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
