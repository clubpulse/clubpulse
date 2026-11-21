'use client';

import { Glyph } from '@/components/icons/Glyph';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getDailyQuiz, pickHilo, playSpin, startHilo, submitQuiz, submitTiming } from '@/lib/actions/games';
import {
  HILO_ROUNDS, QUIZ_LENGTH, SPIN_SEGMENTS, TIMING_BALLS,
  type GameInfo, type GameKey, type GamesState, type HiloView, type QuizResult, type QuizView,
} from '@/lib/types/games';
import { formatScores } from '@/lib/utils/format';
import { card, cardTitle, muted, pill, primaryBtn } from '@/components/play/ui';

const META: Record<GameKey, { icon: string; name: string; blurb: string; prize: (g: GameInfo) => string }> = {
  spin:   { icon: '🎡', name: 'Daily Spin',      blurb: 'One free spin a day',  prize: (g) => `Win up to ${g.value}` },
  quiz:   { icon: '🧠', name: 'Cricket Quiz',    blurb: 'Three questions',      prize: (g) => `+${g.value} each` },
  timing: { icon: '🏏', name: 'Middle It',       blurb: 'Time three shots',     prize: (g) => `Up to +${g.value * TIMING_BALLS}` },
  hilo:   { icon: '📊', name: 'Higher or Lower', blurb: 'Club stats showdown',  prize: (g) => `+${g.value} each` },
};

const center = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' } as const;
const won = (amount: number, capped: boolean) =>
  amount > 0 ? `+${amount} Scores${capped ? ' (weekly limit reached)' : ''}` : capped ? 'No Scores this time: you have reached this week\'s limit.' : 'No Scores this time.';

// ── Daily Spin ───────────────────────────────────────────────────────────────
function Spin({ game, onDone }: { game: GameInfo; onDone: () => void }) {
  const [angle, setAngle] = useState(0);
  const [msg, setMsg] = useState('One free spin every day.');
  const [busy, setBusy] = useState(false);

  async function spin() {
    setBusy(true);
    const res = await playSpin();
    if (!res.success) { setMsg(res.error); setBusy(false); return; }
    // The server has already picked the segment; the wheel turns to show it
    setAngle(360 * 5 - (res.data.index * 45 + 22.5));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { setMsg(won(res.data.amount, res.data.capped)); onDone(); }, reduce ? 50 : 3300);
  }

  return (
    <div style={center}>
      <p style={{ ...cardTitle, margin: 0 }}>Daily Spin</p>
      <div style={{ position: 'relative', width: 'min(240px, 70vw)', aspectRatio: '1' }}>
        <div aria-hidden style={{ position: 'absolute', left: '50%', top: '-10px', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '18px solid #fff', zIndex: 2 }} />
        <div className="cp-wheel" style={{
          position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid #EFC84A', transform: `rotate(${angle}deg)`,
          background: 'conic-gradient(#12306b 0 45deg,#0c1a38 45deg 90deg,#12306b 90deg 135deg,#0c1a38 135deg 180deg,#12306b 180deg 225deg,#0c1a38 225deg 270deg,#12306b 270deg 315deg,#7a5c10 315deg 360deg)',
        }}>
          {SPIN_SEGMENTS.map((f, i) => (
            <b key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transform: `rotate(${i * 45 + 22.5}deg)` }}>
              <span style={{ position: 'absolute', left: '-20px', width: '40px', top: '-100px', textAlign: 'center', fontSize: '15px', fontWeight: 800, color: '#fff' }}>{Math.round(game.value * f)}</span>
            </b>
          ))}
        </div>
      </div>
      <button type="button" onClick={spin} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.5 : 1 }}>Spin the wheel</button>
      <p style={muted} role="status">{msg}</p>
      <style>{'.cp-wheel{transition:transform 3.2s cubic-bezier(.15,.8,.2,1)}@media (prefers-reduced-motion: reduce){.cp-wheel{transition:none}}'}</style>
    </div>
  );
}

// ── Cricket Quiz ─────────────────────────────────────────────────────────────
function Quiz({ onDone }: { onDone: () => void }) {
  const [quiz, setQuiz] = useState<QuizView | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    getDailyQuiz().then((res) => { if (!live) return; if (res.success) setQuiz(res.data); else setError(res.error); });
    return () => { live = false; };
  }, []);

  async function submit() {
    setBusy(true);
    const res = await submitQuiz(answers);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setResult(res.data);
    onDone();
  }

  if (error) return <p style={{ ...muted, color: '#f87171' }}>{error}</p>;
  if (!quiz) return <p style={muted}>Loading today&apos;s questions…</p>;
  const complete = answers.filter((a) => a !== undefined).length === QUIZ_LENGTH;

  return (
    <div>
      <p style={cardTitle}>Cricket Quiz</p>
      {quiz.questions.map((q, qi) => (
        <fieldset key={qi} style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
          <legend style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '6px', padding: 0 }}>{qi + 1}. {q.q}</legend>
          {q.options.map((o, oi) => {
            const picked = answers[qi] === oi;
            const right = result ? result.correctAnswers[qi] === oi : false;
            const wrong = result ? picked && !right : false;
            return (
              <button
                key={oi}
                type="button"
                disabled={!!result}
                aria-pressed={picked}
                onClick={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n; })}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: '13px', padding: '10px 12px', marginTop: '6px',
                  borderRadius: '9px', color: '#fff', cursor: result ? 'default' : 'pointer',
                  background: right ? 'rgba(34,197,94,0.14)' : wrong ? 'rgba(248,113,113,0.12)' : picked ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${right ? '#22C55E' : wrong ? '#f87171' : picked ? '#60A5FA' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {o}{right ? ' ✓' : wrong ? ' ✗' : ''}
              </button>
            );
          })}
        </fieldset>
      ))}
      {result ? (
        <p style={{ ...muted, color: '#fff' }} role="status">You got {result.correct} of {QUIZ_LENGTH}. {won(result.amount, result.capped)}</p>
      ) : (
        <button type="button" onClick={submit} disabled={!complete || busy} style={{ ...primaryBtn, opacity: !complete || busy ? 0.5 : 1 }}>
          {busy ? 'Marking…' : 'Submit answers'}
        </button>
      )}
    </div>
  );
}

// ── Middle It ────────────────────────────────────────────────────────────────
function Timing({ onDone }: { onDone: () => void }) {
  const mark = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const t0 = useRef(0);
  const raf = useRef(0);
  const ballRef = useRef(0);
  const [ball, setBall] = useState(0);
  const [middled, setMiddled] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    t0.current = performance.now();
    const loop = () => {
      const period = 1500 - ballRef.current * 350;
      const ph = ((performance.now() - t0.current) % period) / period;
      pos.current = (ph < 0.5 ? ph * 2 : 2 - ph * 2) * 100;
      if (mark.current) mark.current.style.left = `${pos.current}%`;
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  async function hit() {
    if (ballRef.current >= TIMING_BALLS) return;
    const d = Math.abs(pos.current - 50);
    const good = d <= 7;
    const total = middled + (good ? 1 : 0);
    setMiddled(total);
    ballRef.current += 1;
    setBall(ballRef.current);
    t0.current = performance.now();
    if (ballRef.current < TIMING_BALLS) {
      setMsg(good ? 'Middled it. Six!' : d <= 20 ? 'Decent contact, but not out of the middle.' : 'Played and missed.');
      return;
    }
    cancelAnimationFrame(raf.current);
    setMsg('Checking your over…');
    const res = await submitTiming(total);
    setMsg(res.success ? `${total} of ${TIMING_BALLS} middled. ${won(res.data.amount, res.data.capped)}` : res.error);
    onDone();
  }

  const over = ball >= TIMING_BALLS;
  return (
    <div style={center}>
      <p style={{ ...cardTitle, margin: 0 }}>Middle It · {over ? 'Over' : `Ball ${ball + 1} of ${TIMING_BALLS}`}</p>
      <p style={muted}>Play the shot when the marker is in the green. Each ball is quicker.</p>
      <div style={{ position: 'relative', width: '100%', maxWidth: '460px', height: '34px', borderRadius: '17px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '30%', width: '40%', background: 'rgba(239,200,74,0.18)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '43%', width: '14%', background: 'rgba(34,197,94,0.45)' }} />
        <div ref={mark} style={{ position: 'absolute', top: '2px', bottom: '2px', width: '6px', marginLeft: '-3px', borderRadius: '3px', background: '#fff' }} />
      </div>
      <button type="button" onClick={hit} disabled={over} style={{ ...primaryBtn, opacity: over ? 0.5 : 1 }}>Play the shot</button>
      <p style={{ ...muted, minHeight: '18px' }} role="status">{msg}</p>
    </div>
  );
}

// ── Higher or Lower ──────────────────────────────────────────────────────────
function Hilo({ onDone }: { onDone: () => void }) {
  const [view, setView] = useState<HiloView | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [final, setFinal] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    startHilo().then((res) => { if (!live) return; if (res.success) setView(res.data); else setFinal(res.error); });
    return () => { live = false; };
  }, []);

  async function pick(higher: boolean) {
    setBusy(true);
    const res = await pickHilo(higher);
    if (!res.success) { setMsg(res.error); setBusy(false); return; }
    setReveal(res.data.revealedRuns);
    setMsg(res.data.wasCorrect ? 'Correct.' : 'Wrong call.');
    setTimeout(() => {
      if (res.data.finished) { setFinal(`You got ${res.data.correct} of ${HILO_ROUNDS}. ${won(res.data.amount, res.data.capped)}`); onDone(); }
      else { setView(res.data.next); setReveal(null); setMsg(''); }
      setBusy(false);
    }, 1200);
  }

  if (final) return <p style={{ ...muted, color: '#fff', textAlign: 'center' }} role="status">{final}</p>;
  if (!view) return <p style={muted}>Setting up…</p>;
  const box = { padding: '14px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0 } as const;
  const num = { margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '26px', color: '#fff' } as const;

  return (
    <div style={center}>
      <p style={{ ...cardTitle, margin: 0 }}>Higher or Lower · Round {view.round} of {view.rounds}</p>
      <p style={muted}>Season runs for the club. Did {view.b.name} score more or fewer than {view.a.name}?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center', width: '100%', maxWidth: '460px' }}>
        <div style={box}><p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>{view.a.name}</p><p style={num}>{formatScores(view.a.runs)}</p></div>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>vs</span>
        <div style={box}><p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>{view.b.name}</p><p style={num}>{reveal === null ? '?' : formatScores(reveal)}</p></div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={() => pick(true)} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.5 : 1 }}>▲ Higher</button>
        <button type="button" onClick={() => pick(false)} disabled={busy} style={{ ...primaryBtn, background: 'rgba(255,255,255,0.08)', opacity: busy ? 0.5 : 1 }}>▼ Lower</button>
      </div>
      <p style={{ ...muted, minHeight: '18px' }} role="status">{msg}</p>
    </div>
  );
}

// ── Hub ──────────────────────────────────────────────────────────────────────
export function GamesPanel({ state }: { state: GamesState }) {
  const router = useRouter();
  const [open, setOpen] = useState<GameKey | null>(null);
  const [, start] = useTransition();
  // Games finished in this visit stay on screen so the result is not replaced by "already played"
  const [finishedHere, setFinishedHere] = useState<GameKey[]>([]);
  const done = (k: GameKey) => () => { setFinishedHere((f) => (f.includes(k) ? f : [...f, k])); start(() => router.refresh()); };
  const order: GameKey[] = ['spin', 'quiz', 'timing', 'hilo'];
  const visible = order.filter((k) => state.games[k].enabled);
  const capLeft = state.weekly.cap === null ? null : Math.max(0, state.weekly.cap - state.weekly.used);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div>
          <p style={cardTitle}>Earned from games today</p>
          <p style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#EFC84A', lineHeight: 1 }}>{formatScores(state.earnedToday)}</p>
        </div>
        <p style={{ ...muted, maxWidth: '360px' }}>
          Each game can be played once a day.
          {capLeft !== null ? ` You can earn ${formatScores(capLeft)} more Scores this week from check-ins, challenges and games.` : ''}
        </p>
      </div>

      {visible.length === 0 ? (
        <div style={card}><p style={muted}>Your club has not switched any games on yet.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {visible.map((k) => {
            const g = state.games[k], m = META[k];
            const off = g.played || !!g.locked;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setOpen(k)}
                aria-pressed={open === k}
                style={{
                  fontFamily: 'inherit', textAlign: 'center', padding: '16px 10px 12px', borderRadius: '12px', color: 'inherit', cursor: 'pointer', minWidth: 0,
                  background: open === k ? 'rgba(37,99,235,0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${open === k ? '#60A5FA' : 'rgba(255,255,255,0.08)'}`, opacity: off && open !== k ? 0.6 : 1,
                }}
              >
                <span aria-hidden style={{ display: 'block', fontSize: '34px', lineHeight: 1, marginBottom: '8px' }}><Glyph e={m.icon} /></span>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#fff' }}>{m.name}</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{m.blurb}</span>
                <span style={{ ...pill(g.played ? 'green' : g.locked ? 'grey' : 'gold', true), display: 'inline-block', marginTop: '8px', fontSize: '11px', padding: '3px 9px', borderRadius: '999px' }}>
                  {g.played ? `✓ Played${g.amount > 0 ? ` · +${g.amount}` : ''}` : g.locked ? 'Locked' : m.prize(g)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <div style={card}>
          {state.games[open].played && !finishedHere.includes(open) ? (
            <p style={{ ...muted, textAlign: 'center', color: '#fff' }}>You have played this one today. Come back tomorrow for another go.</p>
          ) : state.games[open].locked && !finishedHere.includes(open) ? (
            <p style={{ ...muted, textAlign: 'center' }}>{state.games[open].locked}</p>
          ) : open === 'spin' ? <Spin key="spin" game={state.games.spin} onDone={done('spin')} />
            : open === 'quiz' ? <Quiz key="quiz" onDone={done('quiz')} />
            : open === 'timing' ? <Timing key="timing" onDone={done('timing')} />
            : <Hilo key="hilo" onDone={done('hilo')} />}
        </div>
      )}
    </div>
  );
}
