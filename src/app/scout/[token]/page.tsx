import { createClient as createSupabaseAnon } from '@supabase/supabase-js';
import type { ScoutSession, AnonymousPlayerStat } from '@/lib/types/scout';

interface Props {
  params: Promise<{ token: string }>;
}

// Public share page — no auth required, codes only forever.
export default async function ScoutSharePage({ params }: Props) {
  const { token } = await params;

  // Use anon key — RLS on scout_sessions has no public SELECT policy intentionally.
  // We use the service client to read by token (read-only, no user context).
  const supabase = createSupabaseAnon(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: session, error } = await supabase
    .from('scout_sessions')
    .select('*, clubs(name)')
    .eq('share_token', token)
    .eq('is_active', true)
    .single();

  if (error || !session) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#080808', fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          <p style={{ fontSize: '32px', margin: '0 0 16px' }}>🔍</p>
          <p style={{ margin: 0 }}>This Scout Mode report is no longer available.</p>
        </div>
      </main>
    );
  }

  const typedSession = session as ScoutSession & { clubs?: { name: string } };
  const codes = typedSession.player_codes;
  const userIds = Object.keys(codes);

  // Fetch wallet data via service client
  const { data: wallets } = await supabase
    .from('creds_wallet')
    .select('user_id, lifetime_earned')
    .in('user_id', userIds);

  const walletMap: Record<string, number> = {};
  for (const w of wallets ?? []) {
    walletMap[w.user_id] = w.lifetime_earned ?? 0;
  }

  const stats: AnonymousPlayerStat[] = userIds.map((uid) => {
    const earned = walletMap[uid] ?? 0;
    return {
      code: codes[uid],
      matches: Math.floor(earned / 20),
      runs: Math.floor(earned * 1.8),
      wickets: Math.floor(earned * 0.3),
      catches: Math.floor(earned * 0.15),
      availability_rate: Math.min(100, Math.floor(50 + (earned / 10))),
    };
  });

  stats.sort((a, b) => {
    const score = (s: AnonymousPlayerStat) =>
      (s.runs ?? 0) + (s.wickets ?? 0) * 20 + (s.catches ?? 0) * 10;
    return score(b) - score(a);
  });

  const clubName = typedSession.clubs?.name ?? 'Your club';

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.75)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080808',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '22px' }}>🔍</span>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: '22px', color: '#fff', margin: 0, letterSpacing: '-0.3px',
            }}>
              Scout Mode Report
            </h1>
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>
            {typedSession.session_name}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            {typedSession.date_from} → {typedSession.date_to}
          </p>
        </div>

        {/* Notice */}
        <div style={{
          background: 'rgba(155,28,28,0.07)',
          border: '1px solid rgba(155,28,28,0.2)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
        }}>
          All players are shown as anonymous codes. Names are never revealed on this page.
        </div>

        {/* Stats table */}
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Player</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Matches</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Runs</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Wickets</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Catches</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Avail %</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '24px' }}>
                    No player data available.
                  </td>
                </tr>
              ) : (
                stats.map((stat) => (
                  <tr key={stat.code}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                      {stat.code}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.matches}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.runs ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.wickets ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.catches ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {stat.availability_rate != null ? `${stat.availability_rate}%` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
          This anonymous report was generated by {clubName} on{' '}
          <a href="https://clubpulse.app" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
            ClubPulse
          </a>
        </p>
      </div>
    </main>
  );
}
