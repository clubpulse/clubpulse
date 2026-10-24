'use client';

import { useState, useTransition } from 'react';
import { logInjury } from '@/lib/actions/injury';
import { BODY_PART_LABELS, SEVERITY_CONFIG, type BodyPart, type InjurySeverity } from '@/lib/types/injury';

const BODY_PARTS = Object.entries(BODY_PART_LABELS) as [BodyPart, string][];
const SEVERITIES = Object.entries(SEVERITY_CONFIG) as [InjurySeverity, (typeof SEVERITY_CONFIG)[InjurySeverity]][];

interface Props {
  clubId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InjuryForm({ clubId, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [bodyPart, setBodyPart] = useState<BodyPart>('knee');
  const [severity, setSeverity] = useState<InjurySeverity>('minor');
  const [description, setDescription] = useState('');
  const [injuredAt, setInjuredAt] = useState(today);
  const [expectedReturn, setExpectedReturn] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await logInjury({
        club_id: clubId,
        body_part: bodyPart,
        severity,
        description: description.trim() || undefined,
        injured_at: injuredAt,
        expected_return: expectedReturn || undefined,
      });
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    });
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '6px',
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Body part</label>
        <select
          value={bodyPart}
          onChange={(e) => setBodyPart(e.target.value as BodyPart)}
          style={inputStyle}
          required
        >
          {BODY_PARTS.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Severity</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {SEVERITIES.map(([val, cfg]) => (
            <button
              key={val}
              type="button"
              onClick={() => setSeverity(val)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: '8px',
                border: severity === val ? '2px solid rgba(155,28,28,0.8)' : '1px solid rgba(255,255,255,0.1)',
                background: severity === val ? 'rgba(155,28,28,0.2)' : 'rgba(255,255,255,0.04)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: severity === val ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Date injured</label>
          <input
            type="date"
            value={injuredAt}
            onChange={(e) => setInjuredAt(e.target.value)}
            max={today}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Expected return</label>
          <input
            type="date"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(e.target.value)}
            min={injuredAt}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Private notes (only you can see this)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="How it happened, treatment notes..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#f87171', margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none',
            background: isPending ? 'rgba(155,28,28,0.4)' : 'rgba(155,28,28,0.85)',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Logging…' : 'Log injury'}
        </button>
      </div>
    </form>
  );
}
