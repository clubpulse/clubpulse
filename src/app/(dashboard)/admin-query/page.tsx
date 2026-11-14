'use client';

/**
 * /admin-query  —  Natural Language Query
 *
 * Club admins and coaches type a plain-English question about their club's data
 * and get an instant AI answer. Claude is given a snapshot of match stats,
 * member data and form ratings server-side — the API key never reaches the client.
 */

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  dataUsed?: string[];
};

const EXAMPLE_QUESTIONS = [
  "Who's been our most consistent batter in the last 6 weeks?",
  "Which bowler has the best economy rate this season?",
  "Who hasn't responded to availability for upcoming fixtures?",
  "What's our win rate at home vs away?",
  "Who are our top 3 performers overall this season?",
  "Which player has improved the most in form recently?",
];

export default function AdminQueryPage() {
  const [clubId, setClubId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load clubId on mount
  useEffect(() => {
    fetch('/api/admin/club-context')
      .then(r => r.json())
      .then(d => {
        if (d.clubId) { setClubId(d.clubId); setIsAdmin(d.isAdmin ?? false); }
        else setIsAdmin(false);
      })
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(question: string) {
    if (!question.trim() || loading || !clubId) return;
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: question.trim() }]);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), clubId }),
      });
      const data = await res.json() as { answer?: string; dataUsed?: string[]; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong');
        setMessages(prev => prev.slice(0, -1)); // remove the user message on error
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer!, dataUsed: data.dataUsed }]);
      }
    } catch {
      setError('Could not reach the server. Try again.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  // ── Render guards ──────────────────────────────────────────────────────────

  if (isAdmin === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Admin access required</p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          This feature is available to club admins and coaches only.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .msg-enter { animation: fadeIn 0.25s ease; }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#fff', margin: 0, letterSpacing: '-0.3px', marginBottom: '6px' }}>
          Club Intelligence
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Ask anything about your club's stats, players and form. Answers come from your real data.
        </p>
      </div>

      {/* Chat area */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        minHeight: '340px',
        maxHeight: '500px',
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏏</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
              Ask your data a question
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              Statistics, form, availability, performance trends — all in plain English.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="msg-enter" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: m.role === 'user' ? '#2563EB' : 'rgba(96,165,250,0.12)',
                display: 'grid', placeItems: 'center', fontSize: '13px',
              }}>
                {m.role === 'user' ? '👤' : '🤖'}
              </div>
              <div style={{ maxWidth: '85%' }}>
                <div style={{
                  background: m.role === 'user' ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${m.role === 'user' ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: m.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#fff',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                </div>
                {m.dataUsed && m.dataUsed.length > 0 && (
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '4px 4px 0', fontStyle: 'italic' }}>
                    Sources: {m.dataUsed.join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="msg-enter" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(96,165,250,0.12)', display: 'grid', placeItems: 'center', fontSize: '13px' }}>
              🤖
            </div>
            <div style={{ display: 'flex', gap: '5px', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px 14px 14px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#60A5FA', animation: `bounce 1s ${d * 0.2}s infinite` }} />
              ))}
              <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); handleSubmit(input); }}
        style={{ display: 'flex', gap: '10px' }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your club's stats…"
          maxLength={500}
          disabled={loading}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            color: '#fff',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 20px',
            background: loading || !input.trim() ? 'rgba(37,99,235,0.3)' : '#2563EB',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Ask
        </button>
      </form>

      {/* Example questions */}
      {messages.length === 0 && (
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
            Try asking
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {EXAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(q)}
                disabled={loading}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#60A5FA'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
