'use client';

// For a coach: the players they work with, and each one's technique progress. Opening a player
// shows, for each kind of analysis they have saved, the latest against the one before and the
// run across their recent sessions.

import { useEffect, useState } from 'react';
import { ComparisonPanel } from '@/components/analyse/ComparisonPanel';
import type { Progress } from '@/lib/analysis/compare';

type Player = { id: string; name: string; sessions: number };
type Loaded = { state: 'loading' } | { state: 'ready'; progress: Progress[] } | { state: 'error'; message: string };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function PlayersProgress() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});

  useEffect(() => {
    fetch('/api/analysis/player-progress')
      .then((r) => (r.ok ? r.json() : { players: [] }))
      .then((d: { players?: Player[] }) => setPlayers(d.players ?? []))
      .catch(() => setPlayers([]));
  }, []);

  const toggle = (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (loaded[id]?.state === 'ready') return;
    setLoaded((l) => ({ ...l, [id]: { state: 'loading' } }));
    fetch(`/api/analysis/player-progress?player=${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error ?? 'Could not load this player.');
        setLoaded((l) => ({ ...l, [id]: { state: 'ready', progress: d.progress as Progress[] } }));
      })
      .catch((e: Error) => setLoaded((l) => ({ ...l, [id]: { state: 'error', message: e.message } })));
  };

  return (
    <section style={{ marginTop: '28px', fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ margin: '0 0 4px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff' }}>Players&apos; progress</h3>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
        Technique analyses saved by players you have a confirmed or completed session with.
      </p>

      {players === null && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Loading…</p>}
      {players?.length === 0 && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>No players yet. A player appears here once you confirm a session with them.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {players?.map((p) => {
          const state = loaded[p.id];
          const isOpen = open === p.id;
          return (
            <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px 14px' }}>
              <button type="button" onClick={() => toggle(p.id)} aria-expanded={isOpen}
                style={{ width: '100%', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{p.sessions} {p.sessions === 1 ? 'session' : 'sessions'} · {isOpen ? 'Hide' : 'Show progress'}</span>
              </button>

              {isOpen && (
                <div style={{ paddingBottom: '14px' }}>
                  {state?.state === 'loading' && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Loading…</p>}
                  {state?.state === 'error' && <p style={{ fontSize: '13px', color: '#F87171' }}>{state.message}</p>}
                  {state?.state === 'ready' && state.progress.length === 0 && (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{p.name} has not saved a technique analysis yet.</p>
                  )}
                  {state?.state === 'ready' && state.progress.map((g) => (
                    <div key={g.kind} style={{ marginTop: '6px' }}>
                      <p style={{ margin: '10px 0 -12px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                        {g.kind}
                        <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>
                          {' '}· latest {g.overall}/100{g.when ? ` on ${day(g.when)}` : ''} · {g.sessions} saved
                        </span>
                      </p>
                      <ComparisonPanel comparison={g.comparison} trend={g.trend} title={g.comparison ? `Latest against the one before${g.comparison.when ? ` · ${day(g.comparison.when)}` : ''}` : 'Only one saved so far'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
