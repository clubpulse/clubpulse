'use client';

/**
 * /features  —  ClubPulse Feature Showcase
 *
 * Sticky left nav with 8 feature categories.
 * Interactive demo panel on the right that mimics the real product UI.
 */

import { useState, useEffect, useRef } from 'react';

/* ─── Types ─────────────────────────────────────────── */
type CategoryId = 'match' | 'ai' | 'performance' | 'team' | 'finance' | 'engagement' | 'community' | 'rewards';

type Category = {
  id: CategoryId;
  icon: string;
  label: string;
  tagline: string;
  features: string[];
};

/* ─── Category metadata ──────────────────────────────── */
const CATEGORIES: Category[] = [
  { id: 'match',       icon: '🏏', label: 'Match Intelligence',  tagline: 'Everything that happens on matchday, in one place.',        features: ['Live scorecard','Opposition briefing','Season wrap','Gut feeling predictions','Match mood tracker'] },
  { id: 'ai',         icon: '🤖', label: 'AI Tools',             tagline: 'Claude-powered insights your club actually acts on.',       features: ['Natural language club query','AI player report','AI coaching analysis','Video pose tracking','Ball tracking'] },
  { id: 'performance',icon: '📈', label: 'Performance',          tagline: 'Track every player\'s arc from debut to their peak.',       features: ['Development tracker','Form guide','Coaching history','Rivalry stats','Cricket CV'] },
  { id: 'team',       icon: '👥', label: 'Team Management',      tagline: 'Selection, availability and logistics without the chaos.',  features: ['Availability planner','Transfer window','Mentor matching','School sessions','Qualifications log'] },
  { id: 'finance',    icon: '💰', label: 'Finance & Fees',        tagline: 'Club finances that actually make sense.',                   features: ['Finance ledger','Fee offset calculator','Community pot','Charity fund','Sponsor a kid'] },
  { id: 'engagement', icon: '🏅', label: 'Engagement',           tagline: 'Turn participation into pride.',                             features: ['Pulse score','Leaderboard','Hall of Infamy','Raffle','Badges & achievements'] },
  { id: 'community',  icon: '🤝', label: 'Community',            tagline: 'The heartbeat of your club between matchdays.',              features: ['Dressing room feed','Noticeboard','Club bible','Wellbeing check-in','Alumni network'] },
  { id: 'rewards',    icon: '🛍️', label: 'Rewards',              tagline: 'Points that pay for kit, discounts and more.',              features: ['Reward marketplace','Kit discounts','Injury intel','Documents vault','Travel planner'] },
];

/* ─── Demo components ─────────────────────────────────── */

function MatchDemo() {
  const [ball, setBall] = useState(0);
  const [runs, setRuns] = useState([34, 67, 12, 8, 55, 0]);
  const [liveScore, setLiveScore] = useState({ runs: 187, wkts: 4, overs: '32.3' });
  const [mood, setMood] = useState<number | null>(null);

  useEffect(() => {
    const outcomes = [0,1,2,4,6,0,1,0,2,4];
    const t = setInterval(() => {
      const run = outcomes[ball % outcomes.length];
      setLiveScore(s => ({ ...s, runs: s.runs + run, overs: `${Math.floor(ball/6)}.${ball%6}` }));
      setBall(b => b + 1);
    }, 2200);
    return () => clearInterval(t);
  }, [ball]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Live scorecard */}
      <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: 'rgba(37,99,235,0.15)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'cp-blink-dot 1.5s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Slough CC vs Maidenhead CC</span>
        </div>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 42, fontWeight: 800, color: '#EFC84A', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {liveScore.runs}/{liveScore.wkts}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{liveScore.overs} overs</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Required</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>214</div>
            <div style={{ fontSize: 11, color: '#60A5FA' }}>RRR 5.2</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0 0 0' }}>
          {[
            { name: 'A. Patel', r: 67, b: 72, sr: '93.1', batting: true },
            { name: 'J. Sharma', r: 34, b: 41, sr: '82.9', batting: true },
            { name: 'K. Williams', r: 55, b: 48, sr: '114.6', batting: false },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
              <span style={{ color: p.batting ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: p.batting ? 600 : 400 }}>
                {p.batting && <span style={{ color: '#EFC84A', marginRight: 6 }}>*</span>}{p.name}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.r} <span style={{ color: 'rgba(255,255,255,0.25)' }}>({p.b})</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Gut feeling + mood */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>⚡ Gut Feeling</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: '#22C55E' }}>68%</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Win probability</div>
        </div>
        <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>😤 Match Mood</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['😤','💪','😬','😴'].map((e, i) => (
              <button key={i} onClick={() => setMood(i)} style={{ background: mood === i ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${mood === i ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 8, padding: '6px 8px', fontSize: 16, cursor: 'pointer' }}>{e}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AIDemo() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ask me anything about your club. I have access to all your match data, player form, availability and fixtures.' }
  ]);
  const [loading, setLoading] = useState(false);

  const CANNED: Record<string, string> = {
    default: "Based on the last 8 matches, **Rahul Patel** leads batting with an average of 47.2. His consistency over the last 4 games (scores of 34, 67, 28, 55) puts him ahead of the pack.",
    bowl: "Your best economy bowler this season is **James Kumar** at 4.8 runs/over across 12 spells. He's taken 18 wickets — most in the club.",
    avail: "3 players haven't responded to this Saturday's availability: **D. Singh**, **T. Okafor** and **M. Chen**. Last week they were all available.",
    form: "**A. Williams** is your most improved player — form rating up 22 points in 6 weeks, moving from 'average' to 'good'. His strike rate has jumped from 71 to 94.",
  };

  function getReply(q: string): string {
    const l = q.toLowerCase();
    if (l.includes('bat') || l.includes('run') || l.includes('score')) return CANNED.default;
    if (l.includes('bowl') || l.includes('wicket') || l.includes('economy')) return CANNED.bowl;
    if (l.includes('avail')) return CANNED.avail;
    if (l.includes('form') || l.includes('improve')) return CANNED.form;
    return CANNED.default;
  }

  function send(q: string) {
    if (!q.trim() || loading) return;
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      setMessages(m => [...m, { role: 'assistant', text: getReply(q) }]);
      setLoading(false);
    }, 900);
  }

  const chips = ["Who's our best batter?", "Best economy bowler?", "Who hasn't replied to availability?"];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: m.role === 'user' ? '#2563EB' : 'rgba(96,165,250,0.12)', display: 'grid', placeItems: 'center', fontSize: 12, flexShrink: 0 }}>
              {m.role === 'user' ? '👤' : '🤖'}
            </div>
            <div style={{ maxWidth: '80%', background: m.role === 'user' ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${m.role === 'user' ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: m.role === 'user' ? '12px 3px 12px 12px' : '3px 12px 12px 12px', padding: '8px 12px', fontSize: 13, color: '#fff', lineHeight: 1.5 }}>
              {m.text.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#60A5FA' }}>{part}</strong> : part)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(96,165,250,0.12)', display: 'grid', placeItems: 'center', fontSize: 12 }}>🤖</div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '3px 12px 12px 12px', padding: '10px 14px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA', display: 'inline-block', animation: `bounce 1s ${d*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chips.map((c, i) => (
          <button key={i} onClick={() => send(c)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>{c}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Ask about your club data…" style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={() => send(input)} style={{ padding: '10px 16px', background: '#2563EB', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ask</button>
      </div>
    </div>
  );
}

function PerformanceDemo() {
  const [selected, setSelected] = useState(0);
  const players = [
    { name: 'A. Patel', scores: [12, 34, 8, 55, 67, 28, 42, 71], wickets: [], rating: 82, trend: 'rising', role: 'Batter' },
    { name: 'J. Kumar', scores: [4, 0, 12, 8, 3, 15, 6, 11], wickets: [2, 0, 3, 1, 2, 4, 1, 3], rating: 74, trend: 'rising', role: 'Bowler' },
    { name: 'M. Singh', scores: [22, 18, 44, 11, 33, 28, 19, 25], wickets: [1, 2, 0, 1, 0, 2, 1, 0], rating: 68, trend: 'steady', role: 'All-rounder' },
  ];
  const p = players[selected];
  const max = Math.max(...p.scores, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {players.map((pl, i) => (
          <button key={i} onClick={() => setSelected(i)} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: selected === i ? '#2563EB' : 'rgba(255,255,255,0.05)', color: selected === i ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}>{pl.name}</button>
        ))}
      </div>
      <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.role}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: '#EFC84A' }}>{p.rating}</div>
            <div style={{ fontSize: 10, color: p.trend === 'rising' ? '#22C55E' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
              {p.trend === 'rising' ? '↑ Rising' : '→ Steady'}
            </div>
          </div>
        </div>
        {/* Sparkline */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Last 8 innings</div>
          <svg viewBox={`0 0 ${p.scores.length * 36} 60`} style={{ width: '100%', height: 60 }}>
            <polyline
              fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round"
              points={p.scores.slice(0, 6).map((s, i) => `${i * 36 + 18},${55 - (s / max) * 48}`).join(' ')}
            />
            <polyline
              fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4,3" opacity="0.5"
              points={p.scores.slice(5).map((s, i) => `${(i + 5) * 36 + 18},${55 - (s / max) * 48}`).join(' ')}
            />
            {p.scores.map((s, i) => (
              <circle key={i} cx={i * 36 + 18} cy={55 - (s / max) * 48} r="4" fill={i >= 6 ? 'rgba(37,99,235,0.4)' : '#2563EB'} stroke="#04091A" strokeWidth="2" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
            {p.scores.map((s, i) => <span key={i}>{s}</span>)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Average', val: (p.scores.reduce((a,b)=>a+b,0)/p.scores.length).toFixed(1) },
            { label: 'High Score', val: Math.max(...p.scores) },
            { label: 'Strike Rate', val: '84.2' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamDemo() {
  const [avail, setAvail] = useState<Record<string, 'yes'|'no'|'maybe'>>({
    'R. Patel': 'yes', 'J. Kumar': 'yes', 'M. Singh': 'maybe',
    'D. Okafor': 'no', 'T. Williams': 'yes', 'A. Chen': 'yes',
    'S. Kapoor': 'maybe', 'B. Ahmed': 'yes', 'C. Davis': 'yes',
    'F. Nair': 'no', 'G. Thompson': 'yes',
  });
  const cycle = (curr: 'yes'|'no'|'maybe'): 'yes'|'no'|'maybe' => curr === 'yes' ? 'no' : curr === 'no' ? 'maybe' : 'yes';
  const colMap = { yes: '#22C55E', no: '#ef4444', maybe: '#EFC84A' };
  const counts = { yes: Object.values(avail).filter(v=>v==='yes').length, maybe: Object.values(avail).filter(v=>v==='maybe').length, no: Object.values(avail).filter(v=>v==='no').length };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {Object.entries(counts).map(([k,n]) => (
          <div key={k} style={{ flex: 1, background: '#04091A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: colMap[k as 'yes'|'no'|'maybe'] }}>{n}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, textTransform: 'capitalize' }}>{k}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Sat 9 Nov — Availability · tap to change</div>
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.entries(avail).map(([name, status]) => (
            <button key={name} onClick={() => setAvail(a => ({...a, [name]: cycle(a[name as keyof typeof a])}))}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 13, color: '#fff' }}>{name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: colMap[status], background: `${colMap[status]}18`, padding: '3px 8px', borderRadius: 5 }}>
                {status === 'yes' ? '✓ Available' : status === 'no' ? '✗ Unavailable' : '? Maybe'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceDemo() {
  const [subs, setSubs] = useState(180);
  const [players, setPlayers] = useState(14);
  const offset = Math.round((subs * players * 0.18));
  const entries = [
    { desc: 'Ground hire — Sat 2 Nov', amount: -120, type: 'expense' },
    { desc: 'Match subscriptions × 11', amount: 220, type: 'income' },
    { desc: 'Kit order — 3 shirts', amount: -89, type: 'expense' },
    { desc: 'Trophy fund contribution', amount: 45, type: 'income' },
    { desc: 'Umpire fees', amount: -40, type: 'expense' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Fee offset calculator */}
      <div style={{ background: '#04091A', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>💰 Fee Offset Calculator</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[
            { label: 'Annual subs (£)', val: subs, set: setSubs, min: 50, max: 500, step: 10 },
            { label: 'Players', val: players, set: setPlayers, min: 5, max: 30, step: 1 },
          ].map(({label, val, set, min, max, step}) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{label}</div>
              <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#2563EB' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 3 }}>{label.includes('£') ? `£${val}` : val}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(239,200,74,0.08)', border: '1px solid rgba(239,200,74,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Potential annual saving</span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#EFC84A' }}>£{offset.toLocaleString()}</span>
        </div>
      </div>
      {/* Ledger */}
      <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recent transactions</div>
        {entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>{e.desc}</span>
            <span style={{ fontWeight: 700, color: e.type === 'income' ? '#22C55E' : '#f97316' }}>
              {e.type === 'income' ? '+' : ''}£{Math.abs(e.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EngagementDemo() {
  const [leaders, setLeaders] = useState([
    { name: 'R. Patel',    pts: 2840, badge: '🏆', delta: +12 },
    { name: 'J. Kumar',    pts: 2615, badge: '⚡', delta: +34 },
    { name: 'A. Singh',    pts: 2410, badge: '🎯', delta: -5  },
    { name: 'M. Williams', pts: 2290, badge: '🏏', delta: +8  },
    { name: 'D. Okafor',   pts: 2185, badge: '🌟', delta: +21 },
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      setLeaders(l => {
        const updated = l.map(p => ({ ...p, pts: p.pts + Math.floor(Math.random() * 15) }));
        return [...updated].sort((a, b) => b.pts - a.pts);
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>🏅 Leaderboard</span>
          <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>● Live</span>
        </div>
        {leaders.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.4s' }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: i === 0 ? '#EFC84A' : 'rgba(255,255,255,0.3)', width: 20 }}>#{i+1}</span>
            <span style={{ fontSize: 18 }}>{p.badge}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.65)' }}>{p.name}</span>
            <span style={{ fontSize: 11, color: p.delta > 0 ? '#22C55E' : '#ef4444', fontWeight: 600 }}>
              {p.delta > 0 ? '↑' : '↓'}{Math.abs(p.delta)}
            </span>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: i === 0 ? '#EFC84A' : '#fff' }}>{p.pts.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(239,200,74,0.06)', border: '1px solid rgba(239,200,74,0.15)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: '#EFC84A' }}>2,840</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Your Pulse Points</div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: '#f97316' }}>🔥 #1</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Hall of Infamy</div>
        </div>
      </div>
    </div>
  );
}

function CommunityDemo() {
  const [liked, setLiked] = useState<number[]>([]);
  const posts = [
    { author: 'Captain Sharma', avatar: '👨‍✈️', time: '2h ago', text: 'Great win today lads. 7 wicket haul from Kumar was simply unreal. Drinks on me Saturday 🍺', likes: 14, comments: 6 },
    { author: 'Club Noticeboard', avatar: '📌', time: '5h ago', text: '⚠️ Ground will be closed for maintenance Mon–Tue next week. All net sessions moved to Farnham Road.', likes: 8, comments: 2 },
    { author: 'Wellbeing Check-in', avatar: '🧡', time: '1d ago', text: 'How are you feeling this week? 8 players checked in. Average score: 7.2/10.', likes: 5, comments: 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {posts.map((p, i) => (
        <div key={i} style={{ background: '#04091A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>{p.avatar}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.author}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{p.time}</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55, margin: '0 0 12px' }}>{p.text}</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => setLiked(l => l.includes(i) ? l.filter(x=>x!==i) : [...l,i])}
              style={{ background: 'none', border: 'none', fontSize: 12, color: liked.includes(i) ? '#60A5FA' : 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', fontWeight: liked.includes(i) ? 700 : 400 }}>
              {liked.includes(i) ? '♥' : '♡'} {p.likes + (liked.includes(i) ? 1 : 0)}
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}>💬 {p.comments}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RewardsDemo() {
  const [pts, setPts] = useState(2840);
  const [redeemed, setRedeemed] = useState<number[]>([]);
  const rewards = [
    { name: 'Dukes Ball', pts: 500, icon: '🏏', desc: 'Match-grade red leather ball' },
    { name: 'Kit Discount', pts: 750, icon: '👕', desc: '20% off your next kit order' },
    { name: 'Ground Hire Credit', pts: 1200, icon: '🏟️', desc: '£30 off a ground booking' },
    { name: 'Coaching Session', pts: 400, icon: '🎯', desc: '1hr with a qualified coach' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'rgba(239,200,74,0.07)', border: '1px solid rgba(239,200,74,0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,200,74,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Your balance</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, color: '#EFC84A', lineHeight: 1.1 }}>{pts.toLocaleString()} pts</div>
        </div>
        <div style={{ fontSize: 36 }}>⚡</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rewards.map((r, i) => (
          <div key={i} style={{ background: '#04091A', border: `1px solid ${redeemed.includes(i) ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{r.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.desc}</div>
            </div>
            <button
              onClick={() => { if (!redeemed.includes(i) && pts >= r.pts) { setPts(p => p - r.pts); setRedeemed(rd => [...rd, i]); }}}
              disabled={redeemed.includes(i) || pts < r.pts}
              style={{ padding: '7px 14px', background: redeemed.includes(i) ? 'rgba(34,197,94,0.15)' : pts >= r.pts ? '#2563EB' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: redeemed.includes(i) ? '#22C55E' : pts >= r.pts ? '#fff' : 'rgba(255,255,255,0.25)', cursor: redeemed.includes(i) || pts < r.pts ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {redeemed.includes(i) ? '✓ Done' : `${r.pts.toLocaleString()} pts`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OppositionDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Captain's Headline</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>Maidenhead are strong with the bat but their new-ball attack has leaked runs in 4 of their last 6 games. Put them in.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>⚠ Key Threats</div>
          {['Top-order batter averaging 54', 'Leg-spinner takes wickets on dry pitches', 'Strong fielding, 3 direct run-outs this season'].map((t,i) => (
            <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, paddingLeft: 12, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#f87171' }}>•</span>{t}
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>✓ Opportunities</div>
          {['Tail exposed early — bowl short', 'Weakness against swing in first 10 overs', 'Chase record is poor — set 200+'].map((t,i) => (
            <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, paddingLeft: 12, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#22C55E' }}>•</span>{t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'rgba(239,200,74,0.05)', border: '1px solid rgba(239,200,74,0.12)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#EFC84A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>🧠 Tactical Tips</div>
        {['Open with your swing bowler — their openers struggle early', 'Field deep on the leg side for the no. 3', 'Target 195+ batting first — their average chase is 171'].map((t,i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(239,200,74,0.12)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: '#EFC84A', flexShrink: 0 }}>{i+1}</div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Demo map ─────────────────────────────────────────── */
const DEMOS: Record<CategoryId, React.ReactNode> = {
  match:       <MatchDemo />,
  ai:          <AIDemo />,
  performance: <PerformanceDemo />,
  team:        <TeamDemo />,
  finance:     <FinanceDemo />,
  engagement:  <EngagementDemo />,
  community:   <CommunityDemo />,
  rewards:     <RewardsDemo />,
};

// Override AI category's demo with opposition intel for a richer second panel
const AI_WITH_OPPOSITION = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <AIDemo />
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Opposition Intelligence Preview</div>
      <OppositionDemo />
    </div>
  </div>
);

/* ─── Page ─────────────────────────────────────────────── */
export default function FeaturesPage() {
  const [active, setActive] = useState<CategoryId>('match');
  const [navOpen, setNavOpen] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  function select(id: CategoryId) {
    setActive(id);
    setNavOpen(false);
    if (window.innerWidth < 768) demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const cat = CATEGORIES.find(c => c.id === active)!;

  return (
    <div className="fp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .fp-root {
          --bg: #05080f; --bg2: #07102B; --fg: #E8EDF5; --fg2: rgba(232,237,245,0.55); --fg3: rgba(232,237,245,0.28);
          --blue: #2563EB; --sky: #60A5FA; --gold: #EFC84A; --green: #22C55E; --border: rgba(255,255,255,0.07);
          min-height: 100vh; background: var(--bg); color: var(--fg); font-family: 'Inter', sans-serif;
        }
        @keyframes cp-blink-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fp-demo-panel { animation: fadeIn 0.25s ease; }

        /* Nav */
        .fp-topnav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(5,8,15,0.92); backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: 0 40px; height: 60px; display: flex; align-items: center; justify-content: space-between;
        }
        .fp-logo { font-family: 'Syne',sans-serif; font-size: 17px; font-weight: 800; text-decoration: none; }
        .fp-logo .club { color: var(--fg); }
        .fp-logo .pulse { color: var(--sky); }
        .fp-topnav-links { display: flex; gap: 4px; }
        .fp-topnav-links a { padding: 6px 13px; font-size: 13px; color: var(--fg2); text-decoration: none; border-radius: 7px; transition: all 0.12s; }
        .fp-topnav-links a:hover { color: var(--fg); background: rgba(255,255,255,0.04); }
        .fp-cta { padding: 8px 18px; background: var(--blue); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 0 20px rgba(37,99,235,0.35); }

        /* Hero strip */
        .fp-hero { padding: 64px 40px 48px; max-width: 1200px; margin: 0 auto; }
        .fp-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sky); margin-bottom: 14px; }
        .fp-h1 { font-family: 'Syne',sans-serif; font-size: clamp(36px,5vw,60px); font-weight: 800; letter-spacing: -0.035em; line-height: 0.95; margin-bottom: 16px; }
        .fp-h1 em { color: var(--sky); font-style: normal; }
        .fp-sub { font-size: 17px; color: var(--fg2); line-height: 1.65; max-width: 560px; }

        /* Main layout */
        .fp-layout { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 200px); border-top: 1px solid var(--border); }
        .fp-sidenav { position: sticky; top: 60px; align-self: start; height: calc(100vh - 60px); overflow-y: auto; border-right: 1px solid var(--border); padding: 24px 16px; }
        .fp-sidenav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-family: 'Inter',sans-serif; transition: all 0.12s; margin-bottom: 2px; }
        .fp-sidenav-item:hover { background: rgba(255,255,255,0.04); }
        .fp-sidenav-item.active { background: rgba(37,99,235,0.14); }
        .fp-sidenav-icon { font-size: 18px; flex-shrink: 0; }
        .fp-sidenav-label { font-size: 13px; font-weight: 600; color: var(--fg2); }
        .fp-sidenav-item.active .fp-sidenav-label { color: var(--fg); }
        .fp-sidenav-count { margin-left: auto; font-size: 10px; color: var(--fg3); background: rgba(255,255,255,0.05); padding: 2px 7px; border-radius: 10px; }

        /* Demo area */
        .fp-demo-area { padding: 40px 48px; max-width: 900px; }
        .fp-demo-header { margin-bottom: 32px; }
        .fp-demo-icon { font-size: 36px; margin-bottom: 12px; }
        .fp-demo-h2 { font-family: 'Syne',sans-serif; font-size: clamp(24px,3vw,36px); font-weight: 800; letter-spacing: -0.025em; color: var(--fg); margin-bottom: 8px; }
        .fp-demo-tagline { font-size: 16px; color: var(--fg2); line-height: 1.6; margin-bottom: 20px; }
        .fp-feat-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 32px; }
        .fp-feat-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 20px; font-size: 12px; color: var(--fg2); }
        .fp-feat-chip::before { content: '✓'; color: var(--green); font-size: 11px; }

        /* Mobile nav toggle */
        .fp-mobile-cat-btn { display: none; }
        .fp-mobile-drawer { display: none; }

        @media (max-width: 768px) {
          .fp-topnav { padding: 0 20px; }
          .fp-topnav-links { display: none; }
          .fp-hero { padding: 40px 20px 32px; }
          .fp-layout { grid-template-columns: 1fr; }
          .fp-sidenav { display: none; }
          .fp-demo-area { padding: 24px 20px; }
          .fp-mobile-cat-btn {
            display: flex; align-items: center; gap: 10px;
            width: calc(100% - 40px); margin: 0 20px 24px;
            padding: 12px 16px; background: rgba(255,255,255,0.04);
            border: 1px solid var(--border); border-radius: 12px;
            font-family: 'Inter',sans-serif; font-size: 14px; font-weight: 600;
            color: var(--fg); cursor: pointer;
          }
          .fp-mobile-drawer.open {
            display: flex; flex-direction: column; gap: 2px;
            margin: 0 20px 20px; padding: 12px;
            background: rgba(255,255,255,0.02); border: 1px solid var(--border);
            border-radius: 14px;
          }
        }

        /* Footer */
        .fp-footer-cta { background: var(--bg2); border-top: 1px solid var(--border); padding: 64px 40px; text-align: center; }
        .fp-footer-cta h2 { font-family: 'Syne',sans-serif; font-size: clamp(28px,4vw,44px); font-weight: 800; letter-spacing: -0.025em; margin-bottom: 14px; }
        .fp-footer-cta p { font-size: 16px; color: var(--fg2); margin-bottom: 32px; }
        .fp-footer-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .fp-footer-btn-p { padding: 14px 32px; background: var(--blue); color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 11px; box-shadow: 0 0 32px rgba(37,99,235,0.4); }
        .fp-footer-btn-g { padding: 14px 24px; border: 1px solid var(--border); color: var(--fg2); font-size: 15px; text-decoration: none; border-radius: 11px; }
      `}</style>

      {/* Top nav */}
      <nav className="fp-topnav">
        <a href="/" className="fp-logo"><span className="club">Club</span><span className="pulse">Pulse</span></a>
        <div className="fp-topnav-links">
          <a href="/">Home</a>
          <a href="/features" style={{ color: 'white' }}>Features</a>
          <a href="/about">About</a>
        </div>
        <a href="/sign-up" className="fp-cta">Get started free →</a>
      </nav>

      {/* Hero */}
      <div className="fp-hero">
        <div className="fp-eyebrow">Every feature, explained</div>
        <h1 className="fp-h1">Built for the full<br /><em>club lifecycle.</em></h1>
        <p className="fp-sub">48 features across 8 categories — from AI coaching analysis to community engagement. Pick a category and try the live demo.</p>
      </div>

      {/* Mobile category toggle */}
      <button className="fp-mobile-cat-btn" onClick={() => setNavOpen(o => !o)}>
        <span>{cat.icon}</span>
        <span>{cat.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{navOpen ? '▲' : '▼'}</span>
      </button>
      <div className={`fp-mobile-drawer ${navOpen ? 'open' : ''}`}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => select(c.id)} className={`fp-sidenav-item ${active === c.id ? 'active' : ''}`}>
            <span className="fp-sidenav-icon">{c.icon}</span>
            <span className="fp-sidenav-label">{c.label}</span>
            <span className="fp-sidenav-count">{c.features.length}</span>
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="fp-layout">
        {/* Sidebar */}
        <nav className="fp-sidenav">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, padding: '0 12px' }}>Categories</div>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => select(c.id)} className={`fp-sidenav-item ${active === c.id ? 'active' : ''}`}>
              <span className="fp-sidenav-icon">{c.icon}</span>
              <span className="fp-sidenav-label">{c.label}</span>
              <span className="fp-sidenav-count">{c.features.length}</span>
            </button>
          ))}
          <div style={{ marginTop: 32, padding: '0 12px' }}>
            <a href="/sign-up" style={{ display: 'block', padding: '11px', background: '#2563EB', color: '#fff', textAlign: 'center', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 20px rgba(37,99,235,0.3)' }}>
              Start free →
            </a>
          </div>
        </nav>

        {/* Demo area */}
        <main className="fp-demo-area" ref={demoRef}>
          <div key={active} className="fp-demo-panel">
            <div className="fp-demo-header">
              <div className="fp-demo-icon">{cat.icon}</div>
              <h2 className="fp-demo-h2">{cat.label}</h2>
              <p className="fp-demo-tagline">{cat.tagline}</p>
              <div className="fp-feat-chips">
                {cat.features.map(f => <span key={f} className="fp-feat-chip">{f}</span>)}
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Live demo — try it ↓
              </div>
            </div>

            {active === 'ai' ? AI_WITH_OPPOSITION : DEMOS[active]}
          </div>
        </main>
      </div>

      {/* Footer CTA */}
      <div className="fp-footer-cta">
        <h2>Ready to run a smarter club?</h2>
        <p>Join clubs across the UK who've replaced 5 different tools with ClubPulse.</p>
        <div className="fp-footer-btns">
          <a href="/sign-up" className="fp-footer-btn-p">Get started — it's free</a>
          <a href="/" className="fp-footer-btn-g">Back to home</a>
        </div>
      </div>
    </div>
  );
}
