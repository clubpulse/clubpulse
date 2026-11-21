import type { Metadata } from 'next';
import { getPublicScorecard } from '@/lib/match-day/public';
import { AutoRefresh } from '@/components/match-day/AutoRefresh';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Live scorecard | ClubPulse',
  robots: { index: false, follow: false },
};

const EVENT_COLOURS: Record<string, string> = {
  milestone: '#facc15', wicket: '#f87171', boundary: '#60a5fa', six: '#c084fc', result: '#4ade80', update: 'rgba(255,255,255,0.55)',
};

const th: React.CSSProperties = { padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' };
const td: React.CSSProperties = { padding: '10px 12px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 13 };

// Public, read-only scorecard. No sign-in. Refreshes every ten seconds while the match is live.
export default async function LiveScorecardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await getPublicScorecard(token);

  if (!m) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#04091A', fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: 24 }}>
        <p style={{ margin: 0 }}>This scorecard is not available.</p>
      </main>
    );
  }

  const live = m.status !== 'completed';
  return (
    <main style={{ minHeight: '100vh', background: '#04091A', fontFamily: "'Inter', sans-serif", color: '#fff', padding: '24px 16px 56px' }}>
      <AutoRefresh active={live} />
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 18 }}>
            Club<span style={{ color: '#60A5FA' }}>Pulse</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: live ? 'rgba(220,38,38,0.3)' : 'rgba(34,197,94,0.2)', color: live ? '#fca5a5' : '#4ade80' }}>
            {live ? '● Live' : 'Completed'}
          </span>
        </header>

        <section style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.35) 0%, rgba(30,30,40,0.95) 100%)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 20, padding: '24px 22px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            {m.clubName} v {m.opposition}{m.venue ? ` · ${m.venue}` : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 52, lineHeight: 1, letterSpacing: '-2px' }}>{m.our.runs}/{m.our.wickets}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17 }}>({m.our.overs} ov) {m.clubName}</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 28, color: 'rgba(255,255,255,0.75)' }}>{m.their.runs}/{m.their.wickets}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>({m.their.overs} ov) {m.opposition}</span>
          </div>
          {m.result && (
            <p style={{ margin: '16px 0 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontWeight: 700 }}>🏆 {m.result}</p>
          )}
        </section>

        {m.lastBalls.length > 0 && (
          <section aria-label="Recent balls" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {m.lastBalls.map((b, i) => (
              <span key={i} style={{ minWidth: 34, padding: '6px 8px', textAlign: 'center', borderRadius: 99, fontSize: 12, fontWeight: 700, background: b.wicket ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.07)', color: b.wicket ? '#fca5a5' : '#fff' }}>{b.label}</span>
            ))}
          </section>
        )}

        {m.batters.length > 0 && (
          <section style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Batter', 'R', 'B', '4s', '6s', 'Out'].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>)}</tr></thead>
              <tbody>
                {m.batters.map((b, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ ...td, textAlign: 'left', color: '#fff', fontWeight: 500 }}>{b.name}</td>
                    <td style={{ ...td, color: '#fff', fontWeight: 700 }}>{b.runs}</td><td style={td}>{b.balls}</td><td style={td}>{b.fours}</td><td style={td}>{b.sixes}</td>
                    <td style={{ ...td, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{b.how_out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {m.bowlers.length > 0 && (
          <section style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Bowler', 'O', 'M', 'R', 'W'].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>)}</tr></thead>
              <tbody>
                {m.bowlers.map((b, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ ...td, textAlign: 'left', color: '#fff', fontWeight: 500 }}>{b.name}</td>
                    <td style={{ ...td, color: '#fff', fontWeight: 700 }}>{b.overs}</td><td style={td}>{b.maidens}</td><td style={td}>{b.runs}</td><td style={td}>{b.wickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {m.commentary.length > 0 && (
          <section>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>Commentary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {m.commentary.slice(0, 15).map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', borderLeft: `3px solid ${EVENT_COLOURS[c.event_type] ?? EVENT_COLOURS.update}`, fontSize: 13, color: EVENT_COLOURS[c.event_type] ?? EVENT_COLOURS.update }}>
                  {/* Auto-awarded Scores lines contain internal ids, so only show lines that do not */}
                  {c.message.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, 'A player')}
                </div>
              ))}
            </div>
          </section>
        )}

        <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          {live ? 'Updates every few seconds. ' : ''}Scored with ClubPulse
        </p>
      </div>
    </main>
  );
}
