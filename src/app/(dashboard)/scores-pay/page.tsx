'use client';

import { Glyph } from '@/components/icons/Glyph';
/**
 * /scores-pay
 *
 * Player-facing QR payment screen.
 * 1. Player enters how many Scores to spend
 * 2. App generates a QR code
 * 3. Merchant scans it → payment fires
 * 4. Screen updates with confirmation
 */

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { scoresToPence } from '@/lib/types/scores';

type Step = 'amount' | 'qr' | 'confirmed' | 'error';

type SessionData = {
  session_id:    string;
  scores_amount: number;
  expires_at:    string;
  qr_payload:    string;
};

export default function ScoresPayPage() {
  const [step, setStep]           = useState<Step>('amount');
  const [inputAmount, setInput]   = useState('');
  const [balance, setBalance]     = useState<number | null>(null);
  const [session, setSession]     = useState<SessionData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [secondsLeft, setSeconds] = useState(300);
  const [loading, setLoading]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current balance
  useEffect(() => {
    fetch('/api/profile/wallet')
      .then(r => r.json())
      .then(d => setBalance(d.flexi_balance ?? 0))
      .catch(() => setBalance(null));
  }, []);

  // Countdown timer while QR is displayed
  useEffect(() => {
    if (step !== 'qr') return;
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setStep('error');
          setErrorMsg('QR code expired. Please generate a new one.');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [step]);

  // Poll for payment confirmation while QR is shown
  useEffect(() => {
    if (step !== 'qr' || !session) return;
    const poll = setInterval(async () => {
      const r = await fetch(`/api/scores/session/status?session_id=${session.session_id}`);
      if (!r.ok) return;
      const d = await r.json();
      if (d.is_used) {
        clearInterval(poll);
        setStep('confirmed');
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [step, session]);

  async function handleGenerateQR() {
    const amount = parseInt(inputAmount, 10);
    if (!amount || amount < 1) return;
    setLoading(true);
    try {
      const r = await fetch('/api/scores/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores_amount: amount }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErrorMsg(data.error === 'insufficient_balance'
          ? `Not enough Scores. Your balance: ${data.balance}`
          : data.error ?? 'Failed to create payment session');
        setStep('error');
        return;
      }
      setSession(data);
      const url = await QRCode.toDataURL(data.qr_payload, { width: 280, margin: 2 });
      setQrDataUrl(url);
      setSeconds(300);
      setStep('qr');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#04091A', margin: 0 }}>Pay with Scores</h1>
        {balance !== null && (
          <p style={{ color: '#6b7280', margin: '6px 0 0', fontSize: 14 }}>
            Balance: <strong style={{ color: '#2563EB' }}>{balance.toLocaleString()} Scores</strong>
          </p>
        )}
      </div>

      {/* Step: enter amount */}
      {step === 'amount' && (
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#374151' }}>
            How many Scores?
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="number"
              min={1}
              max={balance ?? 99999}
              value={inputAmount}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. 200"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #d1d5db',
                fontSize: 18, fontWeight: 600, color: '#04091A',
              }}
            />
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {[50, 100, 200, 500].map(amt => (
              <button
                key={amt}
                onClick={() => setInput(String(amt))}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1.5px solid #d1d5db',
                  background: inputAmount === String(amt) ? '#2563EB' : '#f9fafb',
                  color: inputAmount === String(amt) ? '#fff' : '#374151',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                {amt}
              </button>
            ))}
          </div>

          {inputAmount && (
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
              ≈ £{(scoresToPence(parseInt(inputAmount)) / 100).toFixed(2)} equivalent
            </p>
          )}

          <button
            onClick={handleGenerateQR}
            disabled={loading || !inputAmount || parseInt(inputAmount) < 1}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: '#2563EB', color: '#fff', fontWeight: 700,
              fontSize: 16, border: 'none', cursor: 'pointer',
              opacity: (loading || !inputAmount) ? 0.6 : 1,
            }}
          >
            {loading ? 'Generating…' : 'Generate QR Code'}
          </button>
        </div>
      )}

      {/* Step: show QR */}
      {step === 'qr' && session && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'inline-block', marginBottom: 16,
          }}>
            {qrDataUrl && <img src={qrDataUrl} alt="Payment QR" style={{ display: 'block', width: 280, height: 280 }} />}
          </div>

          <div style={{
            background: '#EFF6FF', borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 20, color: '#2563EB' }}>
              {session.scores_amount.toLocaleString()} Scores
            </p>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
              ≈ £{(scoresToPence(session.scores_amount) / 100).toFixed(2)}
            </p>
          </div>

          <p style={{ color: secondsLeft < 60 ? '#ef4444' : '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
            Expires in {mins}:{secs}
          </p>

          <p style={{ color: '#374151', fontSize: 14, marginBottom: 20 }}>
            Show this to the barman to complete payment
          </p>

          <button
            onClick={() => { setStep('amount'); setInput(''); setSession(null); }}
            style={{
              padding: '10px 24px', borderRadius: 10, border: '1.5px solid #d1d5db',
              background: '#f9fafb', color: '#374151', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Step: confirmed */}
      {step === 'confirmed' && session && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}><Glyph e="✅" /></div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#04091A', margin: '0 0 8px' }}>Payment confirmed!</h2>
          <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 24 }}>
            <strong style={{ color: '#2563EB' }}>{session.scores_amount.toLocaleString()} Scores</strong> spent
          </p>
          <button
            onClick={() => { setStep('amount'); setInput(''); setSession(null); }}
            style={{
              padding: '12px 32px', borderRadius: 12, border: 'none',
              background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* Step: error */}
      {step === 'error' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}><Glyph e="⚠️" /></div>
          <p style={{ color: '#374151', fontSize: 15, marginBottom: 24 }}>{errorMsg}</p>
          <button
            onClick={() => { setStep('amount'); setErrorMsg(''); }}
            style={{
              padding: '12px 32px', borderRadius: 12, border: 'none',
              background: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
