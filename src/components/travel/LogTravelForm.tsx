'use client';

import { useState, useTransition } from 'react';
import { TRAVEL_MODE_CONFIG, calculateTravelCreds, type TravelMode } from '@/lib/types/travel';
import { logTravel } from '@/lib/actions/travel';

interface Props {
  clubId: string;
  onSuccess?: (creds: number) => void;
  onCancel?: () => void;
}

export function LogTravelForm({ clubId, onSuccess, onCancel }: Props) {
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [distance, setDistance] = useState(30);
  const [mode, setMode] = useState<TravelMode>('car');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const previewCreds = calculateTravelCreds(distance);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!destination.trim()) { setError('Please enter a destination'); return; }
    setError('');

    startTransition(async () => {
      const result = await logTravel(clubId, date, destination.trim(), distance, mode, notes || undefined);
      if (result.success) {
        onSuccess?.(result.data.creds_awarded);
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: '6px',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Destination */}
      <div>
        <label style={labelStyle}>Destination</label>
        <input
          style={inputStyle}
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder="e.g. Lord's Cricket Ground, London"
          required
        />
      </div>

      {/* Date */}
      <div>
        <label style={labelStyle}>Travel date</label>
        <input
          type="date"
          style={inputStyle}
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />
      </div>

      {/* Distance */}
      <div>
        <label style={labelStyle}>
          Round-trip distance — <strong style={{ color: '#fff' }}>{distance} miles</strong>
        </label>
        <input
          type="range"
          min={0}
          max={300}
          step={5}
          value={distance}
          onChange={e => setDistance(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#9b1c1c' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
          <span>0 mi</span><span>150 mi</span><span>300 mi</span>
        </div>
      </div>

      {/* Travel mode */}
      <div>
        <label style={labelStyle}>How did you travel?</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.entries(TRAVEL_MODE_CONFIG) as [TravelMode, { emoji: string; label: string }][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                border: mode === key ? '1.5px solid #9b1c1c' : '1.5px solid rgba(255,255,255,0.1)',
                background: mode === key ? 'rgba(155,28,28,0.15)' : 'transparent',
                color: mode === key ? '#fff' : 'rgba(255,255,255,0.45)',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              <span>{cfg.emoji}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes (optional)</label>
        <input
          style={inputStyle}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any extra details..."
        />
      </div>

      {/* Live Scores preview */}
      <div style={{
        background: 'rgba(155,28,28,0.08)',
        border: '1px solid rgba(155,28,28,0.2)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>You&apos;ll earn</span>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          color: '#fff',
        }}>
          {previewCreds} Scores
        </span>
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#f87171', margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.45)',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          style={{
            flex: 2,
            padding: '11px',
            borderRadius: '10px',
            border: 'none',
            background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'background 0.15s',
          }}
        >
          {isPending ? 'Logging…' : `Log trip · ${previewCreds} Scores`}
        </button>
      </div>
    </form>
  );
}
