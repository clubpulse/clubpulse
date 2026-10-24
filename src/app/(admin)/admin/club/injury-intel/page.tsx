import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubInjuryAggregate } from '@/lib/actions/injury';
import { BODY_PART_LABELS, SEVERITY_CONFIG, type InjuryAggregate } from '@/lib/types/injury';

function SeverityDot({ severity }: { severity: InjuryAggregate['severity'] }) {
  const cfg = SEVERITY_CONFIG[severity];
  const colorMap = { 'text-yellow-500': '#eab308', 'text-orange-500': '#f97316', 'text-red-500': '#ef4444' };
  const color = colorMap[cfg.color as keyof typeof colorMap] ?? '#fff';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '12px', fontWeight: 600, color,
    }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

export default async function AdminInjuryIntelPage() {
  const { clubId } = await requireClubAdminPage();
  const result = await getClubInjuryAggregate(clubId);

  const rows: InjuryAggregate[] = result.success ? result.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          🩹 Injury Intel
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Anonymised squad injury overview
        </p>
      </div>

      {/* Privacy disclaimer — prominently shown */}
      <div style={{
        background: 'rgba(59,130,246,0.1)',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '20px', lineHeight: 1 }}>🔒</span>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#93c5fd' }}>
            Individual injury details are never shown to coaches or admins
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            This page shows only anonymised aggregate statistics. Groups with fewer than 2 players are hidden entirely (k-anonymity). No names, descriptions, or individual records are accessible here — by design, not policy.
          </p>
        </div>
      </div>

      {!result.success && (
        <p style={{ fontSize: '14px', color: '#f87171' }}>
          Couldn&apos;t load injury data: {result.error}
        </p>
      )}

      {result.success && rows.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>
            No aggregate data available — team looking fit! 💪
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            Data appears here only when 2 or more players share an injury type.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rows.map((row) => (
            <div
              key={`${row.body_part}-${row.severity}`}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(155,28,28,0.15)', borderRadius: '8px',
                  padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#fff',
                  minWidth: '24px', textAlign: 'center',
                }}>
                  {row.affected_count}
                </div>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                    {BODY_PART_LABELS[row.body_part]} — <SeverityDot severity={row.severity} />
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                    {row.affected_count} {row.affected_count === 1 ? 'player' : 'players'} · avg {row.avg_days_out} days out
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
                color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
              }}>
                anonymised
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
