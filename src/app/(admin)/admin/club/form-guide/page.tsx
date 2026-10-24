import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubFormGuide } from '@/lib/actions/form';
import type { ClubFormGuideEntry, FormTrend } from '@/lib/types/form';

const TREND_ARROW: Record<FormTrend, string> = {
  rising:  '↑',
  falling: '↓',
  steady:  '→',
};

const TREND_COLOR: Record<FormTrend, string> = {
  rising:  '#22c55e',
  falling: '#ef4444',
  steady:  '#6b7280',
};

function MiniSparkline({ scores }: { scores: number[] }) {
  const max = Math.max(...scores, 1);
  const bars = Array.from({ length: 5 }).map((_, i) => scores[i] ?? 0);
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '20px' }}>
      {bars.map((val, i) => {
        const heightPct = val > 0 ? Math.max(0.15, val / max) : 0.08;
        const color = val >= 50 ? '#22c55e' : val >= 25 ? '#c9a84c' : val > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)';
        return (
          <div
            key={i}
            style={{
              width: '8px',
              height: `${Math.round(heightPct * 20)}px`,
              borderRadius: '1px',
              background: color,
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

function SelectionBadge({ rank }: { rank: number }) {
  if (rank > 11) return null;
  return (
    <span style={{
      display: 'inline-block',
      background: 'rgba(201,168,76,0.15)',
      color: '#c9a84c',
      border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 7px',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    }}>
      XI
    </span>
  );
}

export default async function FormGuidePage() {
  const { clubId } = await requireClubAdminPage();
  const result = await getClubFormGuide(clubId);

  const entries: ClubFormGuideEntry[] = result.success ? result.data : [];

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
          Form Guide
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Live form ratings for every player — sorted by recent performance. Top 11 marked for selection.
        </p>
      </div>

      {!result.success && (
        <p style={{ fontSize: '13px', color: '#f87171' }}>{result.error}</p>
      )}

      {result.success && entries.length === 0 && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '14px',
        }}>
          No form data yet. Form ratings appear after match performances are recorded.
        </div>
      )}

      {entries.length > 0 && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 100px 80px 90px 70px 60px',
            gap: '12px',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
          }}>
            <span>Player</span>
            <span style={{ textAlign: 'right' }}>Form</span>
            <span style={{ textAlign: 'center' }}>Trend</span>
            <span>Last 5</span>
            <span style={{ textAlign: 'right' }}>Matches</span>
            <span style={{ textAlign: 'center' }}>Pick</span>
          </div>

          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const trendColor = TREND_COLOR[entry.trend];
            const isTopXI = rank <= 11;
            return (
              <div
                key={entry.user_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 100px 80px 90px 70px 60px',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  background: isTopXI ? 'rgba(255,255,255,0.015)' : 'transparent',
                }}
              >
                {/* Player name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                    {entry.display_name || entry.full_name}
                  </span>
                  {entry.display_name && entry.full_name !== entry.display_name && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {entry.full_name}
                    </span>
                  )}
                </div>

                {/* Rating */}
                <span style={{
                  textAlign: 'right',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: trendColor,
                  fontFamily: "'Syne', sans-serif",
                  letterSpacing: '-0.5px',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {entry.rating.toFixed(1)}
                </span>

                {/* Trend */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '18px', color: trendColor, lineHeight: 1 }}>
                    {TREND_ARROW[entry.trend]}
                  </span>
                  <span style={{ fontSize: '10px', color: trendColor, fontWeight: 600, textTransform: 'uppercase' }}>
                    {entry.trend}
                  </span>
                </div>

                {/* Sparkline */}
                <MiniSparkline scores={entry.last_5_scores} />

                {/* Matches */}
                <span style={{
                  textAlign: 'right',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.5)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {entry.matches_played}
                </span>

                {/* Selection badge */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <SelectionBadge rank={rank} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {[
          { color: '#22c55e', label: 'Rising form' },
          { color: '#ef4444', label: 'Falling form' },
          { color: '#6b7280', label: 'Steady' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            background: 'rgba(201,168,76,0.15)',
            color: '#c9a84c',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 700,
            padding: '1px 5px',
          }}>XI</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Top 11 for selection</span>
        </div>
      </div>
    </div>
  );
}
