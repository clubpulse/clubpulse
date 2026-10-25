'use client';

import { useState, useTransition } from 'react';
import { updateFeeSettings } from '@/lib/actions/fee-offsets';
import type { ClubFeeSettings } from '@/lib/types/fee-offsets';

interface Props {
  clubId: string;
  initialSettings: ClubFeeSettings | null;
}

export function FeeSettingsForm({ clubId, initialSettings }: Props) {
  const [annualFeePounds, setAnnualFeePounds] = useState(
    initialSettings ? (initialSettings.annual_fee_pence / 100).toFixed(2) : '50.00'
  );
  const [scoresPerPound, setScoresPerPound] = useState(
    String(initialSettings?.scores_per_pound ?? 1000)
  );
  const [maxOffsetPercent, setMaxOffsetPercent] = useState(
    String(initialSettings?.max_offset_percent ?? 50)
  );
  const [isActive, setIsActive] = useState(initialSettings?.is_active ?? true);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateFeeSettings(clubId, {
        annual_fee_pence: Math.round(parseFloat(annualFeePounds) * 100),
        scores_per_pound: parseInt(scoresPerPound, 10),
        max_offset_percent: parseInt(maxOffsetPercent, 10),
        is_active: isActive,
      });
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.error);
      }
    });
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  };

  // Preview calculation
  const feePence = Math.round(parseFloat(annualFeePounds || '0') * 100);
  const spp = parseInt(scoresPerPound || '0', 10);
  const maxPct = parseInt(maxOffsetPercent || '0', 10);
  const maxOffsetPence = Math.floor((feePence * maxPct) / 100);
  const maxScores = spp > 0 ? Math.floor((maxOffsetPence * spp) / 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Annual fee (£)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={annualFeePounds}
            onChange={(e) => setAnnualFeePounds(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Scores per £1 off</label>
          <input
            type="number"
            min="1"
            value={scoresPerPound}
            onChange={(e) => setScoresPerPound(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Max offset (%)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={maxOffsetPercent}
            onChange={(e) => setMaxOffsetPercent(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Preview */}
      {feePence > 0 && spp > 0 && maxPct > 0 && (
        <div style={{
          background: 'rgba(201,165,76,0.06)',
          border: '1px solid rgba(201,165,76,0.15)',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.55)',
        }}>
          Preview: Members can apply up to <strong style={{ color: '#c9a54c' }}>{maxScores.toLocaleString()} Scores</strong>{' '}
          for a max discount of <strong style={{ color: '#4ade80' }}>£{(maxOffsetPence / 100).toFixed(2)}</strong>
          {' '}({maxPct}% of £{(feePence / 100).toFixed(2)} fee)
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="checkbox"
          id="fee-offset-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          style={{ width: '16px', height: '16px', accentColor: '#9b1c1c', cursor: 'pointer' }}
        />
        <label htmlFor="fee-offset-active" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
          Enable fee offset for members
        </label>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 14px' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending}
        style={{
          alignSelf: 'flex-start',
          background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #9b1c1c 0%, #c9a54c 100%)',
          border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none',
          borderRadius: '10px',
          padding: '10px 24px',
          fontSize: '14px',
          fontWeight: 700,
          color: saved ? '#4ade80' : '#fff',
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontFamily: "'Syne', sans-serif",
          opacity: isPending ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
      >
        {isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  );
}
