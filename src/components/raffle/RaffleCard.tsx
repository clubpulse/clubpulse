'use client';

import { useState, useTransition } from 'react';
import { buyTickets } from '@/lib/actions/raffles';
import type { Raffle, RaffleWinner } from '@/lib/types/raffle';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function RaffleCard({ raffle, userBalance, onPurchased }: { raffle: Raffle; userBalance: number; onPurchased?: () => void }) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxCanBuy = Math.min(
    raffle.max_tickets_per_player - (raffle.my_ticket_count ?? 0),
    raffle.total_tickets_available != null ? raffle.total_tickets_available - (raffle.total_ticket_count ?? 0) : 999,
    10
  );
  const cost = quantity * raffle.ticket_cost_scores;
  const canAfford = userBalance >= cost;
  const canBuy = maxCanBuy > 0 && canAfford && raffle.status === 'active';

  function handleBuy() {
    setMessage(null);
    startTransition(async () => {
      const result = await buyTickets(raffle.id, quantity);
      if (result.success) {
        setMessage({ ok: true, text: `Got ${result.data.tickets_purchased} ticket(s)! 🎉 #${result.data.ticket_numbers.join(', #')}` });
        setQuantity(1);
        onPurchased?.();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  const ticketsLeft = raffle.total_tickets_available != null ? raffle.total_tickets_available - (raffle.total_ticket_count ?? 0) : null;

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff' }}>{raffle.title}</h3>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: raffle.status === 'active' ? 'rgba(74,222,128,0.15)' : 'rgba(148,163,184,0.15)', color: raffle.status === 'active' ? '#4ade80' : '#94a3b8' }}>
            {raffle.status === 'active' ? 'LIVE' : raffle.status.toUpperCase()}
          </span>
        </div>
        {raffle.description && <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{raffle.description}</p>}
        <div style={{ background: 'rgba(201,165,76,0.1)', border: '1px solid rgba(201,165,76,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(201,165,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Prize</p>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#c9a54c' }}>{raffle.prize_description}</p>
          {raffle.winner_count > 1 && <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(201,165,76,0.6)' }}>{raffle.winner_count} winners</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 12px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Per ticket</p>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>{raffle.ticket_cost_scores} <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>Scores</span></p>
        </div>
        {ticketsLeft !== null && (
          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 12px' }}>
            <p style={{ margin: '0 0 2px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remaining</p>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: ticketsLeft < 10 ? '#f87171' : '#fff' }}>{ticketsLeft}</p>
          </div>
        )}
        {raffle.draw_date && (
          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 12px' }}>
            <p style={{ margin: '0 0 2px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draw date</p>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>{new Date(raffle.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
          </div>
        )}
      </div>

      {(raffle.my_ticket_count ?? 0) > 0 && <p style={{ margin: 0, fontSize: '12px', color: '#c9a54c', fontWeight: 500 }}>🎟️ You have {raffle.my_ticket_count} ticket(s)</p>}

      {raffle.status === 'active' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '4px 8px' }}>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1 || isPending} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '0 4px', opacity: quantity <= 1 ? 0.3 : 1 }}>−</button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
            <button onClick={() => setQuantity(q => Math.min(Math.max(1, maxCanBuy), q + 1))} disabled={quantity >= maxCanBuy || isPending} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '0 4px', opacity: quantity >= maxCanBuy ? 0.3 : 1 }}>+</button>
          </div>
          <button onClick={handleBuy} disabled={!canBuy || isPending} style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none', background: canBuy && !isPending ? 'linear-gradient(135deg, #9b1c1c, #c0392b)' : 'rgba(255,255,255,0.08)', color: canBuy && !isPending ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 600, cursor: canBuy && !isPending ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
            {isPending ? 'Buying…' : !canAfford ? `Need ${cost - userBalance} more Scores` : maxCanBuy <= 0 ? 'Limit reached' : `Buy ${quantity} ticket${quantity > 1 ? 's' : ''} · ${cost} Scores`}
          </button>
        </div>
      )}

      {message && <p style={{ margin: 0, fontSize: '12px', color: message.ok ? '#4ade80' : '#f87171', fontWeight: 500 }}>{message.text}</p>}
    </div>
  );
}

export function DrawnRaffleCard({ raffle, winners }: { raffle: Raffle; winners: Pick<RaffleWinner, 'prize_rank' | 'profile'>[] }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px 20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: 'rgba(255,255,255,0.7)' }}>{raffle.title}</h3>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{raffle.drawn_at ? new Date(raffle.drawn_at).toLocaleDateString('en-GB') : 'Drawn'}</span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'rgba(201,165,76,0.7)' }}>Prize: {raffle.prize_description}</p>
      {winners.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {winners.map(w => <p key={w.prize_rank} style={{ margin: 0, fontSize: '13px', color: '#fff' }}>🏆 {ordinal(w.prize_rank)} place — <span style={{ fontWeight: 600 }}>{w.profile?.full_name ?? 'Member'}</span></p>)}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No entries — draw voided.</p>
      )}
    </div>
  );
}
