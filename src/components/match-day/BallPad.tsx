'use client';

import { useMemo, useState, useTransition } from 'react';
import { recordDelivery, undoLastDelivery, adminUpdateScorecardStatus } from '@/lib/actions/match-day';
import { strikeSwaps, type Delivery, type DismissalType, type ExtraType } from '@/lib/match-day/scoring';
import type { MatchScorecard, RosterPlayer } from '@/lib/types/match-day';

interface Props {
  scorecard: MatchScorecard;
  roster: RosterPlayer[];
  /** Latest balls, newest first. */
  deliveries: Delivery[];
  onChange: () => void;
}

const EXTRAS: { value: ExtraType; label: string }[] = [
  { value: 'none', label: 'Runs' },
  { value: 'wide', label: 'Wide' },
  { value: 'no_ball', label: 'No-ball' },
  { value: 'bye', label: 'Bye' },
  { value: 'leg_bye', label: 'Leg bye' },
];
const DISMISSALS: { value: DismissalType; label: string }[] = [
  { value: 'bowled', label: 'Bowled' },
  { value: 'caught', label: 'Caught' },
  { value: 'lbw', label: 'LBW' },
  { value: 'run_out', label: 'Run out' },
  { value: 'stumped', label: 'Stumped' },
  { value: 'hit_wicket', label: 'Hit wicket' },
  { value: 'other', label: 'Other' },
];

const select: React.CSSProperties = { background: '#0B1220', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 0, flex: 1 };
const label: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 };

// A phone-friendly ball pad: pick the batters and bowler, then tap the outcome of each ball.
export function BallPad({ scorecard, roster, deliveries, onChange }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [extra, setExtra] = useState<ExtraType>('none');
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  const [wicketOpen, setWicketOpen] = useState(false);
  const [dismissal, setDismissal] = useState<DismissalType>('bowled');
  const [outWho, setOutWho] = useState<'striker' | 'non_striker'>('striker');
  const [fielder, setFielder] = useState('');
  const [runsBeforeWicket, setRunsBeforeWicket] = useState(0);

  const innings = scorecard.status === 'our_batting' ? 'our' : scorecard.status === 'our_bowling' ? 'their' : null;
  const mine = useMemo(() => deliveries.filter((d) => d.innings === innings), [deliveries, innings]);
  const last = mine[0];
  const lastId = last?.id;

  // After every ball (including one recorded by another scorer, or an undo), carry the crease forward.
  // Done while rendering when the latest ball changes, which is React's pattern for state that follows a prop.
  const followKey = `${innings}:${lastId ?? ''}`;
  const [seenKey, setSeenKey] = useState(followKey);
  if (seenKey !== followKey) {
    setSeenKey(followKey);
    if (last) {
      if (last.innings === 'our') {
        let s = last.striker_user_id ?? '';
        let n = last.non_striker_user_id ?? '';
        if (last.wicket && last.dismissed_user_id) {
          if (last.dismissed_user_id === s) s = '';
          else if (last.dismissed_user_id === n) n = '';
        }
        if (strikeSwaps(last)) [s, n] = [n, s];
        setStriker(s);
        setNonStriker(n);
      } else {
        setBowler(last.is_legal_delivery && last.ball_in_over === 6 ? '' : last.bowler_user_id ?? '');
      }
    }
    setExtra('none');
    setWicketOpen(false);
  }

  const name = (id: string) => roster.find((r) => r.user_id === id)?.name ?? 'Player';
  const options = (exclude: string[] = []) => roster.filter((r) => !exclude.includes(r.user_id));

  function setSide(status: 'our_batting' | 'our_bowling') {
    setError('');
    startTransition(async () => {
      const res = await adminUpdateScorecardStatus(scorecard.id, status);
      if (!res.success) setError(res.error);
      onChange();
    });
  }

  if (!innings) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Who is batting first?</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => setSide('our_batting')} disabled={pending} style={bigBtn('#2563EB')}>🏏 We are batting</button>
          <button type="button" onClick={() => setSide('our_bowling')} disabled={pending} style={bigBtn('#7f1d1d')}>🎯 We are bowling</button>
        </div>
        {error && <p role="alert" style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p>}
      </div>
    );
  }

  const weBat = innings === 'our';
  const ready = weBat ? !!striker && !!nonStriker && striker !== nonStriker : !!bowler;

  function send(runs: number, wicket?: { type: DismissalType; dismissed: string | null; fielder: string | null }) {
    if (!innings || !ready || pending) return;
    setError('');
    // Work out the ball from the mode and the number tapped.
    let runs_off_bat = 0;
    let extra_runs = 0;
    if (extra === 'none') runs_off_bat = runs;
    else if (extra === 'wide') extra_runs = 1 + runs;
    else if (extra === 'no_ball') { extra_runs = 1; runs_off_bat = runs; }
    else extra_runs = runs; // bye, leg bye
    startTransition(async () => {
      const res = await recordDelivery(scorecard.id, {
        innings,
        runs_off_bat,
        extra_type: extra,
        extra_runs,
        wicket: !!wicket,
        dismissal_type: wicket?.type ?? null,
        dismissed_user_id: wicket?.dismissed ?? null,
        fielder_user_id: wicket?.fielder ?? null,
        striker_user_id: weBat ? striker : null,
        non_striker_user_id: weBat ? nonStriker : null,
        bowler_user_id: weBat ? null : bowler,
      });
      if (!res.success) setError(res.error);
      onChange();
    });
  }

  function confirmWicket() {
    const dismissed = weBat ? (dismissal === 'run_out' && outWho === 'non_striker' ? nonStriker : striker) : null;
    const needsFielder = dismissal === 'caught' || dismissal === 'run_out' || dismissal === 'stumped';
    send(runsBeforeWicket, { type: dismissal, dismissed, fielder: needsFielder && fielder ? fielder : null });
    setRunsBeforeWicket(0);
  }

  function undo() {
    setError('');
    startTransition(async () => {
      const res = await undoLastDelivery(scorecard.id);
      if (!res.success) setError(res.error);
      onChange();
    });
  }

  function endInnings() {
    setSide(weBat ? 'our_bowling' : 'our_batting');
  }

  const strip = mine.slice(0, 6).reverse();
  const maxNumber = extra === 'wide' ? 4 : 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ color: '#fff', fontSize: 14 }}>{weBat ? '🏏 We are batting' : '🎯 We are bowling'}</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          {strip.length === 0 ? <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>No balls yet</span> : strip.map((d, i) => (
            <span key={d.id ?? i} style={{ minWidth: 28, textAlign: 'center', padding: '4px 6px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: d.wicket ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)', color: d.wicket ? '#fca5a5' : '#fff' }}>
              {d.wicket ? 'W' : d.extra_type === 'wide' ? 'wd' : d.extra_type === 'no_ball' ? 'nb' : d.extra_type === 'bye' ? 'b' : d.extra_type === 'leg_bye' ? 'lb' : d.runs_off_bat}
            </span>
          ))}
        </div>
      </div>

      {weBat ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
            <span style={label}>On strike</span>
            <select value={striker} onChange={(e) => setStriker(e.target.value)} style={select}>
              <option value="">Choose batter</option>
              {options([nonStriker]).map((r) => <option key={r.user_id} value={r.user_id}>{r.in_xi ? '' : '· '}{r.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
            <span style={label}>Non-striker</span>
            <select value={nonStriker} onChange={(e) => setNonStriker(e.target.value)} style={select}>
              <option value="">Choose batter</option>
              {options([striker]).map((r) => <option key={r.user_id} value={r.user_id}>{r.in_xi ? '' : '· '}{r.name}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={label}>Our bowler</span>
          <select value={bowler} onChange={(e) => setBowler(e.target.value)} style={select}>
            <option value="">Choose bowler</option>
            {options().map((r) => <option key={r.user_id} value={r.user_id}>{r.in_xi ? '' : '· '}{r.name}</option>)}
          </select>
        </label>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Type of ball">
        {EXTRAS.map((e) => (
          <button key={e.value} type="button" onClick={() => setExtra(e.value)} aria-pressed={extra === e.value}
            style={{ padding: '8px 12px', borderRadius: 99, border: '1px solid', borderColor: extra === e.value ? '#60A5FA' : 'rgba(255,255,255,0.15)', background: extra === e.value ? 'rgba(37,99,235,0.3)' : 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {e.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }} role="group" aria-label={extra === 'none' ? 'Runs off the bat' : 'Runs on this ball'}>
        {Array.from({ length: maxNumber + 1 }, (_, n) => (
          <button key={n} type="button" disabled={!ready || pending} onClick={() => send(n)}
            style={{ padding: '16px 0', borderRadius: 12, border: 'none', background: n === 4 ? '#1d4ed8' : n === 6 ? '#7c3aed' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 20, fontWeight: 800, cursor: !ready || pending ? 'not-allowed' : 'pointer', opacity: !ready ? 0.4 : 1, fontFamily: 'inherit' }}>
            {n}
          </button>
        ))}
        <button type="button" disabled={!ready || pending} onClick={() => setWicketOpen((v) => !v)}
          style={{ padding: '16px 0', borderRadius: 12, border: 'none', background: '#b91c1c', color: '#fff', fontSize: 16, fontWeight: 800, cursor: !ready || pending ? 'not-allowed' : 'pointer', opacity: !ready ? 0.4 : 1, fontFamily: 'inherit' }}>
          Wicket
        </button>
      </div>
      {!ready && <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{weBat ? 'Choose the two batters at the crease to start scoring.' : 'Choose the bowler to start scoring.'}</p>}

      {wicketOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, background: 'rgba(185,28,28,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={label}>How out</span>
            <select value={dismissal} onChange={(e) => setDismissal(e.target.value as DismissalType)} style={select}>
              {DISMISSALS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          {weBat && dismissal === 'run_out' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={label}>Who was out</span>
              <select value={outWho} onChange={(e) => setOutWho(e.target.value as 'striker' | 'non_striker')} style={select}>
                <option value="striker">{striker ? name(striker) : 'Striker'}</option>
                <option value="non_striker">{nonStriker ? name(nonStriker) : 'Non-striker'}</option>
              </select>
            </label>
          )}
          {(dismissal === 'caught' || dismissal === 'run_out' || dismissal === 'stumped') && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={label}>{dismissal === 'stumped' ? 'Keeper' : 'Fielder'} (optional)</span>
              <select value={fielder} onChange={(e) => setFielder(e.target.value)} style={select}>
                <option value="">Not recorded</option>
                {roster.map((r) => <option key={r.user_id} value={r.user_id}>{r.name}</option>)}
              </select>
            </label>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={label}>Runs on the ball first</span>
            <select value={runsBeforeWicket} onChange={(e) => setRunsBeforeWicket(Number(e.target.value))} style={select}>
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" onClick={confirmWicket} disabled={pending} style={bigBtn('#b91c1c')}>Record wicket</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={undo} disabled={pending || !last} style={{ ...ghostBtn, opacity: !last ? 0.4 : 1 }}>↩ Undo last ball</button>
        <button type="button" onClick={endInnings} disabled={pending} style={ghostBtn}>
          {weBat ? 'End our innings: they bat' : 'End their innings: we bat'}
        </button>
      </div>
      {error && <p role="alert" style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p>}
    </div>
  );
}

function bigBtn(bg: string): React.CSSProperties {
  return { flex: 1, padding: '14px 16px', borderRadius: 12, border: 'none', background: bg, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
}
const ghostBtn: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
