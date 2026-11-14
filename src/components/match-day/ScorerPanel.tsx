'use client';

import { useState, useTransition } from 'react';
import {
  adminUpdateInnings,
  adminUpdateScorecardStatus,
  adminAddCommentary,
  adminUpsertPlayerScore,
  adminCompleteMatch,
  adminAwardMatchCreds,
} from '@/lib/actions/match-day';
import type { MatchScorecard, MatchPlayerScore, ScorecardStatus, EventType } from '@/lib/types/match-day';

interface Props {
  scorecard: MatchScorecard;
  players: MatchPlayerScore[];
  onUpdate: () => void;
}

const QUICK_COMMENTS: Array<{ label: string; message: string; event_type: EventType }> = [
  { label: '4️⃣ Four!', message: '4️⃣ FOUR! Ball races to the boundary.', event_type: 'boundary' },
  { label: '6️⃣ Six!', message: '6️⃣ SIX! That\'s gone all the way!', event_type: 'six' },
  { label: '🎯 Wicket!', message: '🎯 WICKET! That\'s a huge moment.', event_type: 'wicket' },
  { label: '🔀 Maiden', message: '🔀 Maiden over — tight bowling.', event_type: 'update' },
];

export function ScorerPanel({ scorecard, players, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition();

  // Innings form state
  const [ourRuns, setOurRuns] = useState(String(scorecard.our_innings.runs));
  const [ourWickets, setOurWickets] = useState(String(scorecard.our_innings.wickets));
  const [ourOvers, setOurOvers] = useState(scorecard.our_innings.overs);
  const [ourExtras, setOurExtras] = useState(String(scorecard.our_innings.extras));
  const [theirRuns, setTheirRuns] = useState(String(scorecard.their_innings.runs));
  const [theirWickets, setTheirWickets] = useState(String(scorecard.their_innings.wickets));
  const [theirOvers, setTheirOvers] = useState(scorecard.their_innings.overs);

  // Commentary
  const [customComment, setCustomComment] = useState('');

  // Player score
  const [selectedPlayer, setSelectedPlayer] = useState(players[0]?.user_id ?? '');
  const [playerRuns, setPlayerRuns] = useState('');
  const [playerBalls, setPlayerBalls] = useState('');
  const [playerFours, setPlayerFours] = useState('');
  const [playerSixes, setPlayerSixes] = useState('');
  const [playerHowOut, setPlayerHowOut] = useState('not out');
  const [playerWickets, setPlayerWickets] = useState('');
  const [playerOvers, setPlayerOvers] = useState('');
  const [playerRunsConceded, setPlayerRunsConceded] = useState('');

  // Award Scores modal
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [credsPlayer, setCredsPlayer] = useState(players[0]?.user_id ?? '');
  const [credsAmount, setCredsAmount] = useState('50');
  const [credsReason, setCredsReason] = useState('');

  // Result
  const [resultText, setResultText] = useState('');

  const [statusMsg, setStatusMsg] = useState('');

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  }

  function saveInnings() {
    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        adminUpdateInnings(scorecard.id, 'our_innings', {
          runs: Number(ourRuns), wickets: Number(ourWickets), overs: ourOvers, extras: Number(ourExtras),
        }),
        adminUpdateInnings(scorecard.id, 'their_innings', {
          runs: Number(theirRuns), wickets: Number(theirWickets), overs: theirOvers, extras: 0,
        }),
      ]);
      if (r1.success && r2.success) { flash('Innings updated'); onUpdate(); }
      else flash('Error saving innings');
    });
  }

  function updateStatus(s: ScorecardStatus) {
    startTransition(async () => {
      const r = await adminUpdateScorecardStatus(scorecard.id, s);
      if (r.success) { flash(`Status → ${s}`); onUpdate(); }
    });
  }

  function addQuickComment(item: typeof QUICK_COMMENTS[0]) {
    startTransition(async () => {
      await adminAddCommentary(scorecard.id, item.message, item.event_type);
      onUpdate();
    });
  }

  function addCustomComment() {
    if (!customComment.trim()) return;
    startTransition(async () => {
      await adminAddCommentary(scorecard.id, customComment.trim(), 'update');
      setCustomComment('');
      onUpdate();
    });
  }

  function savePlayerScore() {
    if (!selectedPlayer) return;
    startTransition(async () => {
      const payload: Parameters<typeof adminUpsertPlayerScore>[0] = {
        scorecardId: scorecard.id,
        userId: selectedPlayer,
      };
      if (playerRuns !== '') payload.runs = Number(playerRuns);
      if (playerBalls !== '') payload.balls_faced = Number(playerBalls);
      if (playerFours !== '') payload.fours = Number(playerFours);
      if (playerSixes !== '') payload.sixes = Number(playerSixes);
      if (playerHowOut) payload.how_out = playerHowOut;
      if (playerWickets !== '') payload.wickets = Number(playerWickets);
      if (playerOvers !== '') payload.overs_bowled = Number(playerOvers);
      if (playerRunsConceded !== '') payload.runs_conceded = Number(playerRunsConceded);

      const r = await adminUpsertPlayerScore(payload);
      if (r.success) { flash('Player score saved'); onUpdate(); }
      else flash('Error saving player score');
    });
  }

  function awardCreds() {
    if (!credsPlayer || !credsReason.trim()) return;
    startTransition(async () => {
      const r = await adminAwardMatchCreds(scorecard.id, credsPlayer, Number(credsAmount), credsReason.trim());
      if (r.success) {
        flash(`${credsAmount} Scores awarded!`);
        setShowCredsModal(false);
        setCredsReason('');
        onUpdate();
      } else flash('Error awarding Scores');
    });
  }

  function completeMatch() {
    if (!resultText.trim()) return;
    startTransition(async () => {
      const r = await adminCompleteMatch(scorecard.id, resultText.trim());
      if (r.success) { flash('Match completed'); onUpdate(); }
    });
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px',
    fontFamily: "'Inter', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px', display: 'block',
  };

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '18px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.35)',
    color: '#fca5a5', borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  };

  const btnGhost: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: isPending ? 0.7 : 1 }}>

      {statusMsg && (
        <div style={{
          background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: '8px', padding: '10px 14px', color: '#4ade80', fontSize: '13px', fontWeight: 600,
        }}>
          {statusMsg}
        </div>
      )}

      {/* Status switcher */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: 0 }}>Match phase</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['setup', 'our_batting', 'our_bowling'] as ScorecardStatus[]).map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              style={{
                ...btnGhost,
                ...(scorecard.status === s ? { background: 'rgba(220,38,38,0.2)', color: '#fca5a5', borderColor: 'rgba(220,38,38,0.4)' } : {}),
              }}
            >
              {s === 'setup' ? '⚙️ Setup' : s === 'our_batting' ? '🏏 We bat' : '🎯 We bowl'}
            </button>
          ))}
        </div>
      </div>

      {/* Innings totals */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: 0 }}>Innings totals</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <span style={labelStyle}>Our runs</span>
            <input style={inputStyle} type="number" value={ourRuns} onChange={e => setOurRuns(e.target.value)} />
          </div>
          <div>
            <span style={labelStyle}>Our wickets</span>
            <input style={inputStyle} type="number" min={0} max={10} value={ourWickets} onChange={e => setOurWickets(e.target.value)} />
          </div>
          <div>
            <span style={labelStyle}>Our overs</span>
            <input style={inputStyle} type="text" placeholder="22.3" value={ourOvers} onChange={e => setOurOvers(e.target.value)} />
          </div>
          <div>
            <span style={labelStyle}>Our extras</span>
            <input style={inputStyle} type="number" value={ourExtras} onChange={e => setOurExtras(e.target.value)} />
          </div>
          <div>
            <span style={labelStyle}>Their runs</span>
            <input style={inputStyle} type="number" value={theirRuns} onChange={e => setTheirRuns(e.target.value)} />
          </div>
          <div>
            <span style={labelStyle}>Their wickets</span>
            <input style={inputStyle} type="number" min={0} max={10} value={theirWickets} onChange={e => setTheirWickets(e.target.value)} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={labelStyle}>Their overs</span>
            <input style={inputStyle} type="text" placeholder="20.0" value={theirOvers} onChange={e => setTheirOvers(e.target.value)} />
          </div>
        </div>
        <button style={btnPrimary} onClick={saveInnings}>Save innings</button>
      </div>

      {/* Quick commentary */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: 0 }}>Commentary</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {QUICK_COMMENTS.map(qc => (
            <button key={qc.label} style={btnGhost} onClick={() => addQuickComment(qc)}>
              {qc.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="text"
            placeholder="Custom commentary…"
            value={customComment}
            onChange={e => setCustomComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustomComment(); }}
          />
          <button style={btnPrimary} onClick={addCustomComment}>Add</button>
        </div>
      </div>

      {/* Player scores */}
      {players.length > 0 && (
        <div style={sectionStyle}>
          <p style={{ ...labelStyle, marginBottom: 0 }}>Player score</p>
          <div>
            <span style={labelStyle}>Player</span>
            <select
              style={{ ...inputStyle }}
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
            >
              {players.map(p => (
                <option key={p.user_id} value={p.user_id}>{p.user_id.slice(0, 12)}…</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div><span style={labelStyle}>Runs</span><input style={inputStyle} type="number" value={playerRuns} onChange={e => setPlayerRuns(e.target.value)} /></div>
            <div><span style={labelStyle}>Balls</span><input style={inputStyle} type="number" value={playerBalls} onChange={e => setPlayerBalls(e.target.value)} /></div>
            <div><span style={labelStyle}>4s</span><input style={inputStyle} type="number" value={playerFours} onChange={e => setPlayerFours(e.target.value)} /></div>
            <div><span style={labelStyle}>6s</span><input style={inputStyle} type="number" value={playerSixes} onChange={e => setPlayerSixes(e.target.value)} /></div>
            <div><span style={labelStyle}>Wkts</span><input style={inputStyle} type="number" value={playerWickets} onChange={e => setPlayerWickets(e.target.value)} /></div>
            <div><span style={labelStyle}>Overs bwld</span><input style={inputStyle} type="text" value={playerOvers} onChange={e => setPlayerOvers(e.target.value)} /></div>
            <div style={{ gridColumn: 'span 3' }}><span style={labelStyle}>Runs conceded</span><input style={inputStyle} type="number" value={playerRunsConceded} onChange={e => setPlayerRunsConceded(e.target.value)} /></div>
            <div style={{ gridColumn: 'span 3' }}>
              <span style={labelStyle}>How out</span>
              <select style={inputStyle} value={playerHowOut} onChange={e => setPlayerHowOut(e.target.value)}>
                {['not out', 'bowled', 'caught', 'lbw', 'run out', 'stumped', 'hit wicket', 'did not bat'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
          <button style={btnPrimary} onClick={savePlayerScore}>Save player score</button>
        </div>
      )}

      {/* Award Scores */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...labelStyle, marginBottom: 0 }}>Award Scores</p>
          <button style={btnPrimary} onClick={() => setShowCredsModal(v => !v)}>
            🏅 Award Scores
          </button>
        </div>

        {showCredsModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <div>
              <span style={labelStyle}>Player</span>
              <select style={inputStyle} value={credsPlayer} onChange={e => setCredsPlayer(e.target.value)}>
                {players.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.user_id.slice(0, 12)}…</option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>Amount</span>
              <input style={inputStyle} type="number" value={credsAmount} onChange={e => setCredsAmount(e.target.value)} />
            </div>
            <div>
              <span style={labelStyle}>Reason (milestone)</span>
              <input style={inputStyle} type="text" placeholder="e.g. 50 run milestone" value={credsReason} onChange={e => setCredsReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={btnPrimary} onClick={awardCreds}>Confirm award</button>
              <button style={btnGhost} onClick={() => setShowCredsModal(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Complete match */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: 0 }}>Complete match</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="text"
            placeholder='e.g. "Won by 23 runs"'
            value={resultText}
            onChange={e => setResultText(e.target.value)}
          />
          <button
            style={{ ...btnPrimary, background: 'rgba(34,197,94,0.2)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}
            onClick={completeMatch}
          >
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}
