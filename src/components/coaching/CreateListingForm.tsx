'use client';

import { useState } from 'react';
import { COACHING_TYPE_CONFIG, type CoachingType, type SessionFormat } from '@/lib/types/coaching';
import { createListing } from '@/lib/actions/coaching';

interface Props {
  clubId: string;
  onCreated?: () => void;
}

const DURATIONS = [30, 45, 60, 90, 120] as const;
const FORMATS: { value: SessionFormat; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
  { value: 'online', label: 'Online' },
];

export function CreateListingForm({ clubId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    coaching_type: 'batting' as CoachingType,
    session_format: 'individual' as SessionFormat,
    duration_minutes: 60,
    max_players: 1,
    scores_cost: 0,
    qualification: '',
    location: '',
  });

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await createListing({ club_id: clubId, ...form });
    setLoading(false);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => { setOpen(false); setSuccess(false); setForm({ title: '', description: '', coaching_type: 'batting', session_format: 'individual', duration_minutes: 60, max_players: 1, scores_cost: 0, qualification: '', location: '' }); onCreated?.(); }, 1200);
    } else {
      setError(res.error);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '8px 16px', borderRadius: '10px', border: 'none',
          background: '#9b1c1c', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        + List a Session
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '24px 16px', overflowY: 'auto',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px',
              fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>
              List a Coaching Session
            </h3>

            {/* Title */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Session title *</span>
              <input
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Advanced Batting Masterclass"
                style={inputStyle}
              />
            </label>

            {/* Description */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="What will players learn or work on?"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>

            {/* Coaching type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Coaching type *</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(Object.keys(COACHING_TYPE_CONFIG) as CoachingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('coaching_type', t)}
                    style={{
                      padding: '5px 10px', borderRadius: '8px', border: '1px solid',
                      borderColor: form.coaching_type === t ? '#9b1c1c' : 'rgba(255,255,255,0.1)',
                      background: form.coaching_type === t ? 'rgba(155,28,28,0.2)' : 'rgba(255,255,255,0.04)',
                      color: form.coaching_type === t ? '#fff' : 'rgba(255,255,255,0.5)',
                      fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {COACHING_TYPE_CONFIG[t].emoji} {COACHING_TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format + duration row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Format *</span>
                <select value={form.session_format} onChange={(e) => set('session_format', e.target.value as SessionFormat)} style={selectStyle}>
                  {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Duration *</span>
                <select value={form.duration_minutes} onChange={(e) => set('duration_minutes', Number(e.target.value))} style={selectStyle}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </label>
            </div>

            {/* Max players (group only) */}
            {form.session_format === 'group' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Max players *</span>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={form.max_players}
                  onChange={(e) => set('max_players', Number(e.target.value))}
                  style={inputStyle}
                />
              </label>
            )}

            {/* Scores cost */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Scores price (0 = free)</span>
              <input
                type="number"
                min={0}
                step={10}
                value={form.scores_cost}
                onChange={(e) => set('scores_cost', Number(e.target.value))}
                style={inputStyle}
              />
            </label>

            {/* Qualification + location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Qualification</span>
                <input
                  value={form.qualification}
                  onChange={(e) => set('qualification', e.target.value)}
                  placeholder="ECB Level 2"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>Location</span>
                <input
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="Club nets / Zoom"
                  style={inputStyle}
                />
              </label>
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '10px', borderRadius: '8px' }}>
                {error}
              </p>
            )}

            {success && (
              <p style={{ margin: 0, fontSize: '13px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                ✓ Listing created!
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                style={{
                  flex: 2, padding: '10px', borderRadius: '10px', border: 'none',
                  background: loading || success ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
                  color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: loading || success ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Creating…' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
};
