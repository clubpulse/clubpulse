'use client';

import { useState, useTransition } from 'react';
import { adminCreateRaffle, adminDrawRaffle } from '@/lib/actions/raffles';
import type { Raffle } from '@/lib/types/raffle';

interface Props {
  clubId: string;
  activeRaffles: Raffle[];
  pastRaffles: Raffle[];
}

export function AdminRafflePanel({ clubId, activeRaffles, pastRaffles }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [drawMessages, setDrawMessages] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const fd = new FormData(e.currentTarget);
    const totalStr = fd.get('total_tickets_available') as string;
    const drawDateStr = fd.get('draw_date') as string;

    startTransition(async () => {
      const result = await adminCreateRaffle({
        club_id: clubId,
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || undefined,
        prize_description: fd.get('prize_description') as string,
        ticket_cost_scores: parseInt(fd.get('ticket_cost_scores') as string, 10),
        max_tickets_per_player: parseInt(fd.get('max_tickets_per_player') as string, 10),
        total_tickets_available: totalStr ? parseInt(totalStr, 10) : undefined,
        winner_count: parseInt(fd.get('winner_count') as string, 10),
        draw_date: drawDateStr || undefined,
      });

      if (result.success) {
        setFormSuccess('Raffle created! Refresh to see it in the list.');
        setShowForm(false);
        (e.target as HTMLFormElement).reset();
      } else {
        setFormError(result.error);
      }
    });
  }

  function handleDraw(raffleId: string) {
    setDrawMessages(m => ({ ...m, [raffleId]: 'Drawing…' }));
    startTransition(async () => {
      const result = await adminDrawRaffle(raffleId);
      if (result.success) {
        const winnerSummary = result.data.winners.map(w => `#${w.ticket_number}`).join(', ');
        setDrawMessages(m => ({ ...m, [raffleId]: `Done! Winning ticket(s): ${winnerSummary || 'none'}. Refresh to see results.` }));
      } else {
        setDrawMessages(m => ({ ...m, [raffleId]: `Error: ${result.error}` }));
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #9b1c1c, #c0392b)',
              color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Create Raffle
          </button>
        ) : (
          <form onSubmit={handleCreate} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff' }}>
              New Raffle
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Title *</label>
                <input name="title" required style={inputStyle} placeholder="Summer Prize Draw" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <input name="description" style={inputStyle} placeholder="Optional description" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Prize description *</label>
                <input name="prize_description" required style={inputStyle} placeholder="e.g. Match-day hospitality package" />
              </div>
              <div>
                <label style={labelStyle}>Ticket cost (Scores) *</label>
                <input name="ticket_cost_scores" type="number" required min={1} defaultValue={50} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Max tickets per player</label>
                <input name="max_tickets_per_player" type="number" required min={1} defaultValue={10} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Total tickets available (blank = unlimited)</label>
                <input name="total_tickets_available" type="number" min={1} style={inputStyle} placeholder="e.g. 100" />
              </div>
              <div>
                <label style={labelStyle}>Number of winners</label>
                <input name="winner_count" type="number" required min={1} defaultValue={1} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Draw date (optional)</label>
                <input name="draw_date" type="datetime-local" style={inputStyle} />
              </div>
            </div>
            {formError && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{formError}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={isPending}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #9b1c1c, #c0392b)',
                  color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? 'Creating…' : 'Create raffle'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '10px 16px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {formSuccess && <p style={{ marginTop: '8px', fontSize: '12px', color: '#4ade80' }}>{formSuccess}</p>}
      </div>

      <section>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Active ({activeRaffles.length})
        </h2>
        {activeRaffles.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No active raffles.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeRaffles.map(r => (
              <div key={r.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{r.title}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {r.ticket_cost_scores} Scores/ticket · {r.total_ticket_count ?? 0} sold · {r.winner_count} winner(s)
                  </p>
                  {drawMessages[r.id] && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4ade80' }}>{drawMessages[r.id]}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDraw(r.id)}
                  disabled={isPending || !!drawMessages[r.id]}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: 'none',
                    background: 'rgba(201,165,76,0.15)',
                    color: '#c9a54c',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    opacity: isPending ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  🎲 Draw Now
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {pastRaffles.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Past ({pastRaffles.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pastRaffles.map(r => (
              <div key={r.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{r.title}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    {r.drawn_at ? new Date(r.drawn_at).toLocaleDateString('en-GB') : r.status}
                  </p>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                  background: r.status === 'drawn' ? 'rgba(148,163,184,0.1)' : 'rgba(248,113,113,0.1)',
                  color: r.status === 'drawn' ? '#94a3b8' : '#f87171',
                }}>
                  {r.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
