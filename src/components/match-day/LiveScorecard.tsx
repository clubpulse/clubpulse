'use client';

import { useState, useEffect, useTransition } from 'react';
import { getScorecardWithPlayers } from '@/lib/actions/match-day';
import { ScorerPanel } from './ScorerPanel';
import type { MatchScorecard, MatchPlayerScore, MatchCommentary } from '@/lib/types/match-day';

interface Props {
  scorecard: MatchScorecard;
  isAdmin: boolean;
  clubId: string;
  currentUserId: string;
}

function strikeRate(runs: number, balls: number): string {
  if (!balls) return '—';
  return ((runs / balls) * 100).toFixed(1);
}

function economy(runs: number, overs: number): string {
  if (!overs) return '—';
  return (runs / overs).toFixed(2);
}

const EVENT_COLOURS: Record<string, string> = {
  milestone: '#facc15',
  wicket: '#f87171',
  boundary: '#60a5fa',
  six: '#c084fc',
  result: '#4ade80',
  update: 'rgba(255,255,255,0.55)',
};

export function LiveScorecard({ scorecard: initial, isAdmin, clubId, currentUserId }: Props) {
  const [scorecard, setScorecard] = useState<MatchScorecard>(initial);
  const [players, setPlayers] = useState<MatchPlayerScore[]>([]);
  const [commentary, setCommentary] = useState<MatchCommentary[]>([]);
  const [tab, setTab] = useState<'batting' | 'bowling'>('batting');
  const [showScorer, setShowScorer] = useState(false);
  const [, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const res = await getScorecardWithPlayers(scorecard.id);
      if (res.success) {
        setScorecard(res.data.scorecard);
        setPlayers(res.data.playerScores);
        setCommentary(res.data.commentary);
      }
    });
  }

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scorecard.id]);

  const our = scorecard.our_innings;
  const their = scorecard.their_innings;

  const batters = [...players].sort((a, b) => (a.batting_position ?? 99) - (b.batting_position ?? 99));
  const bowlers = [...players].filter(p => p.overs_bowled > 0).sort((a, b) => b.wickets - a.wickets);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Main scoreboard */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(155,28,28,0.3) 0%, rgba(30,30,40,0.95) 100%)',
        border: '1px solid rgba(220,38,38,0.2)', borderRadius: '20px', padding: '28px 24px',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
          vs {scorecard.opposition}{scorecard.venue ? ` · ${scorecard.venue}` : ''}
        </p>

        {/* Our innings — big */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0', fontWeight: 600 }}>
            Our XI
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '54px',
              color: '#fff', lineHeight: 1, letterSpacing: '-2px',
            }}>
              {our.runs}/{our.wickets}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', fontWeight: 500 }}>
              ({our.overs} ov)
            </span>
          </div>
          {our.extras > 0 && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Extras: {our.extras}
            </p>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />

        {/* Their innings — smaller */}
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0', fontWeight: 600 }}>
            {scorecard.opposition}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '28px', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
              {their.runs}/{their.wickets}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
              ({their.overs} ov)
            </span>
          </div>
        </div>

        {scorecard.result && (
          <div style={{
            marginTop: '16px', background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.25)', borderRadius: '10px',
            padding: '10px 14px',
          }}>
            <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '15px', margin: 0 }}>
              🏆 {scorecard.result}
            </p>
          </div>
        )}
      </div>

      {/* Tabs: batting / bowling */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {(['batting', 'bowling'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '13px', fontFamily: "'Inter', sans-serif",
                background: tab === t ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#fca5a5' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.15s',
              }}
            >
              {t === 'batting' ? '🏏 Batting' : '🎯 Bowling'}
            </button>
          ))}
        </div>

        {tab === 'batting' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden' }}>
            {batters.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px', margin: 0, fontSize: '14px' }}>
                No batting data yet
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Batter', 'R', 'B', '4s', '6s', 'SR', 'How out'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textAlign: h === 'Batter' ? 'left' : 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batters.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>{p.user_id.slice(0, 8)}…</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'center' }}>{p.runs}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>{p.balls_faced}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>{p.fours}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>{p.sixes}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>{strikeRate(p.runs, p.balls_faced)}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '12px' }}>{p.how_out ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'bowling' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden' }}>
            {bowlers.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px', margin: 0, fontSize: '14px' }}>
                No bowling data yet
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Bowler', 'O', 'M', 'R', 'W', 'Econ'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textAlign: h === 'Bowler' ? 'left' : 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bowlers.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>{p.user_id.slice(0, 8)}…</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'center' }}>{p.overs_bowled}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>{p.maidens}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>{p.runs_conceded}</td>
                      <td style={{ padding: '10px 12px', color: p.wickets >= 5 ? '#facc15' : '#fff', fontWeight: p.wickets >= 5 ? 700 : 400, textAlign: 'center' }}>{p.wickets}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>{economy(p.runs_conceded, p.overs_bowled)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Commentary feed */}
      {commentary.length > 0 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 10px 0' }}>
            Live Commentary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {commentary.slice(0, 10).map(c => (
              <div key={c.id} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start',
                borderLeft: `3px solid ${EVENT_COLOURS[c.event_type] ?? EVENT_COLOURS.update}`,
              }}>
                <p style={{ color: EVENT_COLOURS[c.event_type] ?? EVENT_COLOURS.update, margin: 0, fontSize: '13px', flex: 1 }}>
                  {c.message}
                </p>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scorer panel toggle */}
      {isAdmin && scorecard.status !== 'completed' && (
        <div>
          <button
            onClick={() => setShowScorer(v => !v)}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(220,38,38,0.3)',
              background: showScorer ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.05)',
              color: '#fca5a5', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
            }}
          >
            {showScorer ? '▲ Hide Scorer Panel' : '📋 Open Scorer Panel'}
          </button>

          {showScorer && (
            <div style={{ marginTop: '16px' }}>
              <ScorerPanel
                scorecard={scorecard}
                players={players}
                onUpdate={reload}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
