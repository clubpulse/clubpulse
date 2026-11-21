'use client';

import { Glyph } from '@/components/icons/Glyph';
/**
 * /gift-cards
 *
 * Player redeems Scores for gift cards via Tango Card.
 * Shows available gift cards, lets the player redeem, and displays the voucher code.
 */

import { useState, useEffect } from 'react';

type GiftCard = {
  id:               string;
  title:            string;
  description:      string | null;
  image_url:        string | null;
  creds_cost:       number;
  tango_amount_gbp: number;
};

type VoucherResult = {
  redemption_id:          string;
  scores_spent:           number;
  balance_after:          number;
  // manual: the card is ordered by hand and emailed later, so there is no code to show yet
  manual?:                boolean;
  message?:               string;
  voucher: {
    token?:                   string | null;
    redemption_instructions?: string | null;
    expiry?:                  string | null;
  };
};

type Step = 'browse' | 'confirm' | 'processing' | 'voucher' | 'error';

const BRAND_COLOURS: Record<string, string> = {
  amazon:   '#FF9900',
  tesco:    '#00539F',
  nike:     '#111111',
  jd:       '#E31B22',
  deliveroo:'#00CCBC',
};

function cardColour(title: string): string {
  const t = title.toLowerCase();
  for (const [key, col] of Object.entries(BRAND_COLOURS)) {
    if (t.includes(key)) return col;
  }
  return '#2563EB';
}

export default function GiftCardsPage() {
  const [cards, setCards]         = useState<GiftCard[]>([]);
  const [balance, setBalance]     = useState<number | null>(null);
  const [selected, setSelected]   = useState<GiftCard | null>(null);
  const [step, setStep]           = useState<Step>('browse');
  const [voucher, setVoucher]     = useState<VoucherResult | null>(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    // Load gift cards from marketplace
    fetch('/api/marketplace/rewards?category=gift_card')
      .then(r => r.json())
      .then(d => setCards(Array.isArray(d) ? d : (d.rewards ?? [])))
      .catch(() => {});

    // Load balance
    fetch('/api/profile/wallet')
      .then(r => r.json())
      .then(d => setBalance(d.flexi_balance ?? 0))
      .catch(() => {});
  }, []);

  async function handleRedeem() {
    if (!selected) return;
    setStep('processing');
    setLoading(true);
    try {
      const r = await fetch('/api/scores/redeem-gift-card', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reward_id: selected.id }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setError(data.error ?? 'Redemption failed');
        setStep('error');
        return;
      }
      setVoucher(data);
      setBalance(data.balance_after);
      setStep('voucher');
    } catch {
      setError('Something went wrong. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#04091A', margin: 0 }}>Gift Cards</h1>
        <p style={{ color: '#6b7280', margin: '6px 0 0', fontSize: 14 }}>
          Redeem your Scores for real gift cards
          {balance !== null && (
            <> · <strong style={{ color: '#2563EB' }}>{balance.toLocaleString()} Scores available</strong></>
          )}
        </p>
      </div>

      {/* Browse */}
      {step === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: 14 }}>Loading gift cards…</p>
          )}
          {cards.map(card => {
            const canAfford = balance !== null && balance >= card.creds_cost;
            return (
              <div
                key={card.id}
                onClick={() => { if (canAfford) { setSelected(card); setStep('confirm'); } }}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           16,
                  padding:       '14px 16px',
                  borderRadius:  12,
                  border:        `1.5px solid ${canAfford ? '#e5e7eb' : '#f3f4f6'}`,
                  background:    canAfford ? '#fff' : '#fafafa',
                  cursor:        canAfford ? 'pointer' : 'default',
                  opacity:       canAfford ? 1 : 0.5,
                  transition:    'box-shadow 0.15s',
                }}
              >
                {/* Brand colour swatch */}
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: cardColour(card.title),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 20 }}><Glyph e="🎁" /></span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#04091A' }}>{card.title}</p>
                  {card.description && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{card.description}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#2563EB' }}>
                    {card.creds_cost.toLocaleString()}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Scores</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm */}
      {step === 'confirm' && selected && (
        <div>
          <div style={{
            background:   cardColour(selected.title),
            borderRadius: 16, padding: '28px 24px', marginBottom: 20,
            textAlign:    'center', color: '#fff',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 36 }}><Glyph e="🎁" /></p>
            <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{selected.title}</p>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>£{selected.tango_amount_gbp?.toFixed(2)} gift card</p>
          </div>

          <div style={{ background: '#f9fafb', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: '1.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#374151' }}>Cost</span>
              <span style={{ fontWeight: 700, color: '#2563EB' }}>{selected.creds_cost.toLocaleString()} Scores</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#374151' }}>Balance after</span>
              <span style={{ fontWeight: 700, color: '#04091A' }}>{((balance ?? 0) - selected.creds_cost).toLocaleString()} Scores</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Your gift card code will appear immediately and also be emailed to you. This action cannot be undone.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRedeem}
              disabled={loading}
              style={{
                flex: 1, padding: '13px', borderRadius: 10, border: 'none',
                background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              Confirm Redemption
            </button>
            <button
              onClick={() => { setSelected(null); setStep('browse'); }}
              style={{
                padding: '13px 16px', borderRadius: 10, border: '1.5px solid #d1d5db',
                background: '#f9fafb', color: '#374151', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {step === 'processing' && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 36, margin: '0 0 16px' }}>⏳</p>
          <p style={{ color: '#6b7280', fontSize: 15 }}>Issuing your gift card…</p>
        </div>
      )}

      {/* Voucher */}
      {step === 'voucher' && voucher && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontSize: 48, margin: '0 0 8px' }}><Glyph e="🎉" /></p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#04091A', margin: '0 0 4px' }}>
              {voucher.manual ? 'Gift card ordered!' : 'Gift card issued!'}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>{voucher.scores_spent.toLocaleString()} Scores spent</p>
          </div>

          {voucher.manual && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '16px 18px', marginBottom: 16, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#1E3A8A' }}>
                {voucher.message ?? 'We will email your gift card to you within 2 working days.'}
              </p>
            </div>
          )}

          {voucher.voucher.token && (
            <div style={{
              background: '#04091A', borderRadius: 14, padding: '20px 20px',
              marginBottom: 16, textAlign: 'center',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>Your code</p>
              <p style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: 3, fontFamily: 'monospace' }}>
                {voucher.voucher.token}
              </p>
              <button
                onClick={() => copyToken(voucher.voucher.token!)}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: copied ? '#16a34a' : '#2563EB',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copied' : 'Copy code'}
              </button>
            </div>
          )}

          {voucher.voucher.redemption_instructions && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>How to use</p>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                {voucher.voucher.redemption_instructions}
              </p>
            </div>
          )}

          {voucher.voucher.expiry && (
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: '0 0 20px' }}>
              Expires: {new Date(voucher.voucher.expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
            A copy has also been sent to your email address.
          </p>

          <button
            onClick={() => { setStep('browse'); setVoucher(null); setSelected(null); }}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            Redeem another
          </button>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}><Glyph e="⚠️" /></p>
          <p style={{ color: '#374151', fontSize: 15, marginBottom: 24 }}>{error}</p>
          <button
            onClick={() => { setStep('browse'); setError(''); setSelected(null); }}
            style={{
              padding: '12px 32px', borderRadius: 10, border: 'none',
              background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}
          >
            Back to gift cards
          </button>
        </div>
      )}
    </div>
  );
}
