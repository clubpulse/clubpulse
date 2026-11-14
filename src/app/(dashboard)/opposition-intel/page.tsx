'use client';

/**
 * /opposition-intel  —  Opposition Intelligence Briefing
 *
 * Captain's pre-match AI briefing card. Fetches PlayCricket data server-side
 * (if the opposition has a site ID) and runs it through Claude to generate
 * tactical insights. Anthropic API key never reaches the client.
 */

import { useState, useEffect } from 'react';

type Briefing = {
  headline: string;
  recentForm: string;
  keyThreats: string[];
  opportunities: string[];
  tacticalTips: string[];
  targetScore: string | null;
  confidence: 'high' | 'medium' | 'low';
};

type BriefingResult = {
  briefing: Briefing;
  opponent: string;
  matchDate?: string;
  venue?: string;
  dataSource: 'playcricket' | 'ai-general';
  matchesAnalysed: number;
};

type Fixture = {
  id: string;
  opponent: string;
  match_date: string;
  venue?: string;
  format?: string;
};

const CONFIDENCE_CONFIG = {
  high:   { label: 'High confidence', color: '#2ecc71', bg: 'rgba(46,204,113,0.08)', desc: 'Based on real PlayCricket match data' },
  medium: { label: 'Medium confidence', color: '#EFC84A', bg: 'rgba(239,200,74,0.08)', desc: 'Based on limited PlayCricket data' },
  low:    { label: 'AI estimate', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', desc: 'No PlayCricket data — general tactical briefing' },
};

export default function OppositionIntelPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);

  // Form state
  const [selectedFixtureId, setSelectedFixtureId] = useState('');
  const [manualOpponent, setManualOpponent] = useState('');
  const [manualSiteId, setManualSiteId] = useState('');
  const [manualVenue, setManualVenue] = useState('');
  const [useManual, setUseManual] = useState(false);

  // Result state
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  // Load upcoming fixtures
  useEffect(() => {
    fetch('/api/admin/club-context')
      .then(r => r.json())
      .then(async ({ clubId }: { clubId: string | null }) => {
        if (!clubId) return;
        const res = await fetch(`/api/fixtures?clubId=${clubId}&upcoming=true`);
        if (!res.ok) return;
        const data = await res.json() as { fixtures?: Fixture[] };
        setFixtures(data.fixtures ?? []);
      })
      .catch(() => {})
      .finally(() => setFixturesLoading(false));
  }, []);

  const selectedFixture = fixtures.find(f => f.id === selectedFixtureId);

  async function generate() {
    setLoading(true);
    setError(null);

    const payload = useManual
      ? { opponent: manualOpponent.trim(), opponentSiteId: manualSiteId.trim() || undefined, venue: manualVenue.trim() || undefined }
      : { opponent: selectedFixture?.opponent, venue: selectedFixture?.venue, matchDate: selectedFixture?.match_date, fixtureId: selectedFixtureId };

    if (!payload.opponent) {
      setError('Please select a fixture or enter an opponent name.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/fixtures/opposition-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as BriefingResult & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to generate briefing');
      } else {
        setResult(data);
        setGenerated(true);
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const confCfg = result ? CONFIDENCE_CONFIG[result.briefing.confidence] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '760px' }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
        select option { background: #0C1A38; color: #fff; }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#fff', margin: 0, letterSpacing: '-0.3px', marginBottom: '6px' }}>
          Opposition Intelligence
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          AI-powered captain's briefing — threats, opportunities and tactical tips before you take the field.
        </p>
      </div>

      {/* Setup card */}
      {!generated && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['fixture', 'manual'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setUseManual(mode === 'manual')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: (mode === 'manual') === useManual ? '#2563EB' : 'rgba(255,255,255,0.05)',
                  color: (mode === 'manual') === useManual ? '#fff' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'fixture' ? '📅 From upcoming fixture' : '✏️ Enter manually'}
              </button>
            ))}
          </div>

          {/* Fixture picker */}
          {!useManual && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                Select fixture
              </label>
              {fixturesLoading ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Loading fixtures…</div>
              ) : fixtures.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                  No upcoming fixtures found. <button onClick={() => setUseManual(true)} style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: '13px', padding: 0 }}>Enter manually →</button>
                </div>
              ) : (
                <select
                  value={selectedFixtureId}
                  onChange={e => setSelectedFixtureId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Choose a fixture…</option>
                  {fixtures.map(f => (
                    <option key={f.id} value={f.id}>
                      vs {f.opponent} — {new Date(f.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{f.format ? ` (${f.format})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Manual form */}
          {useManual && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                  Opponent name *
                </label>
                <input
                  value={manualOpponent}
                  onChange={e => setManualOpponent(e.target.value)}
                  placeholder="e.g. Hambledon CC"
                  style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                  PlayCricket site ID <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — for real data)</span>
                </label>
                <input
                  value={manualSiteId}
                  onChange={e => setManualSiteId(e.target.value)}
                  placeholder="e.g. 12345"
                  style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  Find this on play-cricket.com in the club's URL. Without it, ClubPulse generates a general tactical briefing.
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                  Venue <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  value={manualVenue}
                  onChange={e => setManualVenue(e.target.value)}
                  placeholder="e.g. The Bat & Ball Ground"
                  style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && !generated && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || (!useManual && !selectedFixtureId) || (useManual && !manualOpponent.trim())}
            style={{
              padding: '14px 24px',
              background: loading ? 'rgba(37,99,235,0.4)' : '#2563EB',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: (!loading && !useManual && !selectedFixtureId) || (!loading && useManual && !manualOpponent.trim()) ? 0.5 : 1,
              alignSelf: 'flex-start',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Analysing opposition…
              </span>
            ) : '🔍 Generate briefing →'}
          </button>
        </div>
      )}

      {/* Briefing card */}
      {result && result.briefing && confCfg && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Match info bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ padding: '10px 16px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>vs {result.opponent}</span>
            </div>
            {result.matchDate && (
              <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                📅 {new Date(result.matchDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
              </div>
            )}
            {result.venue && (
              <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                📍 {result.venue}
              </div>
            )}
            <div style={{ padding: '8px 14px', background: confCfg.bg, border: `1px solid ${confCfg.color}33`, borderRadius: '10px', fontSize: '12px', color: confCfg.color, fontWeight: 600 }}>
              {confCfg.label}{result.matchesAnalysed > 0 ? ` · ${result.matchesAnalysed} matches` : ''}
            </div>
          </div>

          {/* Headline */}
          <div style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: '14px', padding: '20px 24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Captain's Headline</p>
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#fff', lineHeight: 1.5, margin: 0 }}>{result.briefing.headline}</p>
          </div>

          {/* Recent form */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Recent Form</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, margin: 0 }}>{result.briefing.recentForm}</p>
          </div>

          {/* Two column: threats + opportunities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>⚠ Key Threats</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.briefing.keyThreats.map((t, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }}>•</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: 'rgba(46,204,113,0.05)', border: '1px solid rgba(46,204,113,0.12)', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>✓ Opportunities</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.briefing.opportunities.map((o, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#2ecc71', flexShrink: 0, marginTop: '1px' }}>•</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tactical tips */}
          <div style={{ background: 'rgba(239,200,74,0.05)', border: '1px solid rgba(239,200,74,0.12)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#EFC84A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>🧠 Tactical Tips</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {result.briefing.tacticalTips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(239,200,74,0.12)', border: '1px solid rgba(239,200,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#EFC84A' }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, margin: 0 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Target score */}
          {result.briefing.targetScore && (
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '14px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>🎯</div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Target Score</p>
                <p style={{ fontSize: '15px', color: '#fff', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>{result.briefing.targetScore}</p>
              </div>
            </div>
          )}

          {/* Data source notice */}
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            {result.dataSource === 'playcricket'
              ? `ℹ Briefing generated from ${result.matchesAnalysed} PlayCricket matches this season.`
              : 'ℹ No PlayCricket data available — briefing is an AI tactical estimate. Add the opposition\'s PlayCricket site ID for real data.'}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setGenerated(false); setResult(null); setError(null); }}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
            >
              ← New briefing
            </button>
            <button
              onClick={generate}
              disabled={loading}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
            >
              {loading ? 'Regenerating…' : '↺ Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
