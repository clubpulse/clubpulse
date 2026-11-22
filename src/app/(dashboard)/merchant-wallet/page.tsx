'use client';

import { Glyph } from '@/components/icons/Glyph';
/**
 * /merchant-wallet
 *
 * Club admin view — merchant wallet dashboard.
 * Shows Scores balance, recent payments received, and cashout request form.
 * Also the QR scanner to accept player payments.
 */

import { useState, useEffect, useRef } from 'react';
import { SCORES_PER_GBP, MIN_CASHOUT_SCORES, scoresToPence, cashoutPence } from '@/lib/types/scores';

type WalletData = {
  scores_balance:      number;
  lifetime_received:   number;
  pending_cashout:     number;
  available_gbp_pence: number;
};

type Payment = {
  id:            string;
  payer_id:      string;
  scores_amount: number;
  net_scores:    number;
  fee_scores:    number;
  description:   string | null;
  created_at:    string;
};

type ScanStep = 'idle' | 'scanning' | 'confirm' | 'processing' | 'done' | 'error';

// QR payload shape from player's app
type QrPayload = {
  type:          string;
  session_id:    string;
  scores_amount: number;
};

export default function MerchantWalletPage() {
  const [clubId, setClubId]         = useState<string | null>(null);
  const [wallet, setWallet]         = useState<WalletData | null>(null);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [cashoutAmt, setCashout]    = useState('');
  const [cashoutMsg, setCashoutMsg] = useState('');
  const [scanStep, setScanStep]     = useState<ScanStep>('idle');
  const [scanned, setScanned]       = useState<QrPayload | null>(null);
  const [scanDesc, setScanDesc]     = useState('');
  const [scanError, setScanError]   = useState('');
  const [loading, setLoading]       = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load club_id from profile
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => setClubId(d.club_id ?? null))
      .catch(() => {});
  }, []);

  // Load wallet when club_id known
  useEffect(() => {
    if (!clubId) return;
    fetchWallet();
    fetchPayments();
  }, [clubId]);

  async function fetchWallet() {
    const r = await fetch(`/api/scores/cashout?club_id=${clubId}`);
    if (r.ok) setWallet(await r.json());
  }

  async function fetchPayments() {
    const r = await fetch(`/api/scores/payments?club_id=${clubId}`);
    if (r.ok) setPayments(await r.json());
  }

  // ── QR scan: paste JSON payload from device camera app ──────────────────
  async function handlePasteQR() {
    setScanStep('scanning');
    setScanError('');
    // On mobile the camera app decodes the QR and the user pastes the result.
    // We use a textarea for paste input here; a future version uses jsQR + canvas.
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  async function handleQrInput(raw: string) {
    try {
      const payload: QrPayload = JSON.parse(raw.trim());
      if (payload.type !== 'clubpulse_scores_payment' || !payload.session_id) {
        setScanError('Not a valid ShiftUp payment QR');
        return;
      }
      setScanned(payload);
      setScanStep('confirm');
    } catch {
      setScanError('Could not read QR data. Please try again.');
    }
  }

  async function handleConfirmPayment() {
    if (!scanned || !clubId) return;
    setScanStep('processing');
    setLoading(true);
    try {
      const r = await fetch('/api/scores/pay', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          session_id:  scanned.session_id,
          club_id:     clubId,
          description: scanDesc || 'Bar / club shop purchase',
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setScanError(data.error ?? 'Payment failed');
        setScanStep('error');
      } else {
        setScanStep('done');
        await fetchWallet();
        await fetchPayments();
      }
    } catch {
      setScanError('Network error. Please try again.');
      setScanStep('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCashout() {
    const amount = parseInt(cashoutAmt, 10);
    if (!amount || amount < MIN_CASHOUT_SCORES || !clubId) return;
    setLoading(true);
    const r = await fetch('/api/scores/cashout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ club_id: clubId, scores_amount: amount }),
    });
    const data = await r.json();
    setLoading(false);
    if (data.ok) {
      setCashoutMsg(`✅ Queued ${amount.toLocaleString()} Scores — £${(data.gbp_pence / 100).toFixed(2)} arriving within 3 business days`);
      setCashout('');
      await fetchWallet();
    } else {
      setCashoutMsg(`❌ ${data.error ?? 'Cashout failed'}`);
    }
  }

  const gbpAvailable = wallet ? (wallet.available_gbp_pence / 100).toFixed(2) : '0.00';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#04091A', marginBottom: 4 }}>Merchant Wallet</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Accept Scores payments and cash out to your bank</p>

      {/* Balance card */}
      {wallet && (
        <div style={{
          background: 'linear-gradient(135deg, #04091A 0%, #0C1A38 100%)',
          borderRadius: 16, padding: '20px 24px', color: '#fff', marginBottom: 24,
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, opacity: 0.7 }}>Available Scores</p>
          <p style={{ margin: '0 0 16px', fontSize: 32, fontWeight: 800 }}>
            {wallet.scores_balance.toLocaleString()}
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>≈ GBP value</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>£{gbpAvailable}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>Pending cashout</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{wallet.pending_cashout.toLocaleString()} pts</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>Lifetime received</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{wallet.lifetime_received.toLocaleString()} pts</p>
            </div>
          </div>
        </div>
      )}

      {/* Accept payment */}
      <div style={{ background: '#f9fafb', borderRadius: 14, padding: 20, marginBottom: 20, border: '1.5px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#04091A' }}>Accept a Payment</h2>

        {scanStep === 'idle' && (
          <button
            onClick={handlePasteQR}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: '#2563EB', color: '#fff', fontWeight: 700,
              fontSize: 15, border: 'none', cursor: 'pointer',
            }}
          >
            📷 Scan Player QR
          </button>
        )}

        {scanStep === 'scanning' && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              Scan the player's QR code with your camera, then paste the result below:
            </p>
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder='Paste QR data here…'
              onChange={e => { if (e.target.value.includes('{')) handleQrInput(e.target.value); }}
              style={{
                width: '100%', borderRadius: 8, border: '1.5px solid #d1d5db',
                padding: '10px 12px', fontSize: 13, boxSizing: 'border-box',
              }}
            />
            {scanError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>{scanError}</p>}
            <button onClick={() => setScanStep('idle')} style={{ marginTop: 8, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        )}

        {scanStep === 'confirm' && scanned && (
          <div>
            <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 20, color: '#2563EB' }}>
                {scanned.scores_amount.toLocaleString()} Scores
              </p>
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
                ≈ £{(scoresToPence(scanned.scores_amount) / 100).toFixed(2)}
              </p>
            </div>
            <input
              placeholder="Description (e.g. 2× Cokes)"
              value={scanDesc}
              onChange={e => setScanDesc(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1.5px solid #d1d5db', fontSize: 14, marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConfirmPayment}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: '#16a34a', color: '#fff', fontWeight: 700,
                  fontSize: 15, border: 'none', cursor: 'pointer',
                }}
              >
                Confirm Payment
              </button>
              <button
                onClick={() => { setScanStep('idle'); setScanned(null); }}
                style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: '#f9fafb', color: '#374151', fontWeight: 600,
                  fontSize: 15, border: '1.5px solid #d1d5db', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {scanStep === 'processing' && (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '16px 0' }}>Processing payment…</p>
        )}

        {scanStep === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}><Glyph e="✅" /></p>
            <p style={{ fontWeight: 700, color: '#16a34a', marginBottom: 12 }}>Payment received!</p>
            <button
              onClick={() => { setScanStep('idle'); setScanned(null); setScanDesc(''); }}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Accept another
            </button>
          </div>
        )}

        {scanStep === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ef4444', marginBottom: 12 }}>{scanError}</p>
            <button
              onClick={() => { setScanStep('idle'); setScanError(''); }}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Cashout */}
      <div style={{ background: '#f9fafb', borderRadius: 14, padding: 20, marginBottom: 20, border: '1.5px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#04091A' }}>Cash Out</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px' }}>
          {SCORES_PER_GBP} Scores = £{(cashoutPence(SCORES_PER_GBP) / 100).toFixed(2)} · Minimum {MIN_CASHOUT_SCORES} Scores · 3 business days
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            type="number"
            min={MIN_CASHOUT_SCORES}
            max={wallet?.scores_balance ?? 0}
            value={cashoutAmt}
            onChange={e => setCashout(e.target.value)}
            placeholder="Scores to cash out"
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8,
              border: '1.5px solid #d1d5db', fontSize: 15,
            }}
          />
          <button
            onClick={handleCashout}
            disabled={loading || !cashoutAmt || parseInt(cashoutAmt) < MIN_CASHOUT_SCORES}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: '#2563EB', color: '#fff', fontWeight: 700,
              fontSize: 15, cursor: 'pointer',
              opacity: loading || !cashoutAmt ? 0.6 : 1,
            }}
          >
            Request
          </button>
        </div>
        {cashoutAmt && parseInt(cashoutAmt) >= 100 && (
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>
            You'll receive ≈ £{(cashoutPence(parseInt(cashoutAmt)) / 100).toFixed(2)}
          </p>
        )}
        {cashoutMsg && <p style={{ fontSize: 13, margin: 0 }}>{cashoutMsg}</p>}
      </div>

      {/* Recent payments */}
      {payments.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#04091A' }}>Recent Payments</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payments.slice(0, 10).map(p => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f9fafb', borderRadius: 10, padding: '10px 14px',
                border: '1px solid #e5e7eb',
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#04091A' }}>
                    {p.description ?? 'Purchase'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                    {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#16a34a', fontSize: 15 }}>
                    +{p.net_scores.toLocaleString()}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                    {p.fee_scores} fee
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
