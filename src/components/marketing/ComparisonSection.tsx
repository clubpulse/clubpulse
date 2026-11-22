export default function ComparisonSection() {
  type Platform = 'shiftup' | 'pitchero' | 'teamapp' | 'playcricket';
  const platforms: { id: Platform; name: string; short: string }[] = [
    { id: 'shiftup', name: 'SHIFTUP', short: 'SU' },
    { id: 'pitchero', name: 'Pitchero', short: 'Pi' },
    { id: 'teamapp', name: 'TeamApp', short: 'TA' },
    { id: 'playcricket', name: 'Play-Cricket', short: 'PC' },
  ];

  type Check = '✓' | '~' | '✕';
  type Row = { label: string; cp: Check; pi: Check; ta: Check; pc: Check; note?: string };
  const rows: Row[] = [
    { label: 'Built for cricket only',          cp: '✓', pi: '~', ta: '✕', pc: '✓', note: 'Pitchero covers all sports; TeamApp is generic' },
    { label: 'Live in-app scorecard',            cp: '✓', pi: '✓', ta: '✕', pc: '~', note: 'Play-Cricket is web-only, no native app' },
    { label: 'AI coaching & opposition intel',   cp: '✓', pi: '✕', ta: '✕', pc: '✕', note: 'SHIFTUP-exclusive: Claude-powered insights' },
    { label: 'Availability & XI selection',      cp: '✓', pi: '✓', ta: '✓', pc: '✕' },
    { label: 'Integrated fee & finance tracking', cp: '✓', pi: '~', ta: '~', pc: '✕', note: 'Others require third-party payment tools' },
    { label: 'Loyalty rewards for players',      cp: '✓', pi: '✕', ta: '✕', pc: '✕', note: 'SHIFTUP Scores: earn, redeem, retain players' },
    { label: 'Player performance dashboard',     cp: '✓', pi: '~', ta: '✕', pc: '~', note: 'Deep stats with AI-driven trend analysis' },
    { label: 'Free for players',                 cp: '✓', pi: '✕', ta: '✓', pc: '✓' },
    { label: 'Club plan from £29.99/mo',          cp: '✓', pi: '✕', ta: '~', pc: '✓' },
    { label: 'Mobile-first native experience',   cp: '✓', pi: '~', ta: '✓', pc: '✕' },
  ];

  const colStyle = (id: Platform): React.CSSProperties => id === 'shiftup'
    ? { background: 'rgba(37,99,235,0.08)', borderLeft: '1px solid rgba(37,99,235,0.3)', borderRight: '1px solid rgba(37,99,235,0.3)' }
    : {};

  const checkColor = (v: Check) =>
    v === '✓' ? '#4ade80' : v === '~' ? '#facc15' : '#f87171';

  return (
    <section id="compare" style={{ padding: '80px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <p style={{ textAlign: 'center', color: 'var(--sky)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
          How we stack up
        </p>
        <h2 style={{ textAlign: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
          A generation ahead of the alternatives
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '16px', marginBottom: '48px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          SHIFTUP was built for how cricket clubs actually run today — not retrofitted from a generic sports template.
        </p>

        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)' }}>Feature</th>
                {platforms.map(p => (
                  <th key={p.id} style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, fontSize: '13px', background: p.id === 'shiftup' ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.03)', color: p.id === 'shiftup' ? 'var(--sky)' : 'rgba(255,255,255,0.6)', ...colStyle(p.id) }}>
                    <span style={{ display: 'none' }} aria-hidden="true">{p.short}</span>
                    <span>{p.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                  <td style={{ padding: '13px 20px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                    {row.label}
                    {row.note && <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{row.note}</span>}
                  </td>
                  {(['cp','pi','ta','pc'] as const).map((k, ci) => {
                    const val = row[k];
                    const pid = platforms[ci].id;
                    return (
                      <td key={k} style={{ padding: '13px 16px', textAlign: 'center', fontSize: '17px', ...colStyle(pid) }}>
                        <span style={{ color: checkColor(val), fontWeight: val === '✓' ? 700 : 400 }}>{val}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          ✓ full support · ~ partial / third-party · ✕ not available
        </p>
      </div>
    </section>
  );
}

/* ── PRICING SECTION ── */
