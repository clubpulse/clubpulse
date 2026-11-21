'use client';

import { useState } from 'react';
import { card, cardTitle, muted } from '@/components/play/ui';
import type { ScoresPack, ScoresPackPurchase } from '@/lib/types/subscription';

type Props = {
  clubId: string;
  packs: ScoresPack[];
  poolBalance: number;
  recentPurchases: ScoresPackPurchase[];
};

export function ScoresPacksPanel({ clubId, packs, poolBalance, recentPurchases }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePurchase(packId: string) {
    setLoading(packId);
    try {
      const res = await fetch('/api/club/scores-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId, pack_id: packId }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Pool balance */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <p style={cardTitle}>Scores pool</p>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: '36px',
              color: '#EFC84A',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {poolBalance.toLocaleString()}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <p style={{ ...muted, fontSize: '11px' }}>Face value</p>
          <p style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            £{(poolBalance / 500).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Packs grid */}
      <div>
        <p style={{ ...cardTitle, marginBottom: '12px' }}>Buy Scores packs</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          {packs.map((pack) => (
            <div
              key={pack.id}
              style={{
                background: 'rgba(239,200,74,0.04)',
                border: '1px solid rgba(239,200,74,0.15)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                {pack.name}
              </span>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  color: '#EFC84A',
                }}
              >
                {pack.scores_amount.toLocaleString()}
              </span>
              <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)' }}>
                {pack.description}
              </span>
              <button
                onClick={() => handlePurchase(pack.id)}
                disabled={loading !== null}
                style={{
                  marginTop: '6px',
                  padding: '9px',
                  borderRadius: '9px',
                  border: 'none',
                  background: '#00C853',
                  color: '#0C1220',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}
              >
                {loading === pack.id
                  ? 'Opening checkout...'
                  : `Buy · £${(pack.price_pence / 100).toFixed(2)}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase history */}
      {recentPurchases.length > 0 && (
        <div style={card}>
          <p style={{ ...cardTitle, marginBottom: '10px' }}>Recent purchases</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentPurchases.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '12.5px',
                }}
              >
                <span style={{ color: '#EFC84A', fontWeight: 600, minWidth: '70px' }}>
                  +{p.scores_amount.toLocaleString()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', flex: 1 }}>
                  £{(p.price_pence / 100).toFixed(2)}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      p.payment_status === 'succeeded'
                        ? 'rgba(34,197,94,0.15)'
                        : p.payment_status === 'pending'
                          ? 'rgba(234,179,8,0.15)'
                          : 'rgba(239,68,68,0.15)',
                    color:
                      p.payment_status === 'succeeded'
                        ? '#22C55E'
                        : p.payment_status === 'pending'
                          ? '#EAB308'
                          : '#EF4444',
                    fontWeight: 600,
                  }}
                >
                  {p.payment_status}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                  {new Date(p.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
