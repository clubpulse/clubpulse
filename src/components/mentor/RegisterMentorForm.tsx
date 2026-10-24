'use client';

import { useState } from 'react';
import type { BattingStyle, BowlingStyle, Speciality, MentorProfile } from '@/lib/types/mentor';
import { registerAsMentor } from '@/lib/actions/mentor';

const BATTING_OPTIONS: { value: BattingStyle; label: string }[] = [
  { value: 'right-hand', label: 'Right-hand bat' },
  { value: 'left-hand', label: 'Left-hand bat' },
];

const BOWLING_OPTIONS: { value: BowlingStyle; label: string }[] = [
  { value: 'right-arm-fast', label: 'Right-arm fast' },
  { value: 'right-arm-medium', label: 'Right-arm medium' },
  { value: 'right-arm-spin', label: 'Right-arm spin' },
  { value: 'left-arm-fast', label: 'Left-arm fast' },
  { value: 'left-arm-medium', label: 'Left-arm medium' },
  { value: 'left-arm-spin', label: 'Left-arm spin' },
  { value: 'none', label: "Don't bowl" },
];

const SPECIALITY_OPTIONS: { value: Speciality; label: string }[] = [
  { value: 'batting', label: '🏏 Batting' },
  { value: 'bowling', label: '🎯 Bowling' },
  { value: 'fielding', label: '🧤 Fielding' },
  { value: 'wicketkeeping', label: '🧤 Wicket-keeping' },
  { value: 'allround', label: '⚡ All-round' },
];

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '10px 12px',
  fontSize: '14px',
  color: '#fff',
  outline: 'none',
  appearance: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
  display: 'block',
};

interface Props {
  clubId: string;
  existing?: MentorProfile | null;
  onSaved?: (profile: MentorProfile) => void;
}

export function RegisterMentorForm({ clubId, existing, onSaved }: Props) {
  const [batting, setBatting] = useState<BattingStyle | ''>(existing?.batting_style ?? '');
  const [bowling, setBowling] = useState<BowlingStyle | ''>(existing?.bowling_style ?? '');
  const [speciality, setSpeciality] = useState<Speciality | ''>(existing?.speciality ?? '');
  const [years, setYears] = useState(existing?.years_experience ?? 5);
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [maxMentees, setMaxMentees] = useState(existing?.max_mentees ?? 2);
  const [available, setAvailable] = useState(existing?.is_available ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    const res = await registerAsMentor({
      club_id: clubId,
      batting_style: batting as BattingStyle || undefined,
      bowling_style: bowling as BowlingStyle || undefined,
      speciality: speciality as Speciality || undefined,
      years_experience: years,
      bio: bio || undefined,
      max_mentees: maxMentees,
      is_available: available,
    });

    setLoading(false);
    if (res.success) {
      setSaved(true);
      onSaved?.(res.data);
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Batting style</label>
          <select value={batting} onChange={(e) => setBatting(e.target.value as BattingStyle)} style={selectStyle}>
            <option value="">Select…</option>
            {BATTING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Bowling style</label>
          <select value={bowling} onChange={(e) => setBowling(e.target.value as BowlingStyle)} style={selectStyle}>
            <option value="">Select…</option>
            {BOWLING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Speciality</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {SPECIALITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSpeciality(speciality === o.value ? '' : o.value)}
              style={{
                background: speciality === o.value ? 'rgba(155,28,28,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${speciality === o.value ? 'rgba(155,28,28,0.6)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '20px', padding: '6px 14px',
                fontSize: '13px', fontWeight: 600,
                color: speciality === o.value ? '#f87171' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Years at club</label>
          <input
            type="number" min={1} max={50} value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            style={{ ...selectStyle }}
          />
        </div>
        <div>
          <label style={labelStyle}>Max mentees</label>
          <input
            type="number" min={1} max={10} value={maxMentees}
            onChange={(e) => setMaxMentees(Number(e.target.value))}
            style={{ ...selectStyle }}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Bio (optional)</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell juniors a bit about yourself and what you can help with…"
          rows={3}
          style={{
            ...selectStyle,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
      </div>

      <label style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        cursor: 'pointer', userSelect: 'none',
      }}>
        <div
          onClick={() => setAvailable(!available)}
          style={{
            width: '42px', height: '24px', borderRadius: '12px',
            background: available ? '#9b1c1c' : 'rgba(255,255,255,0.12)',
            position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'absolute', top: '3px',
            left: available ? '20px' : '3px',
            width: '18px', height: '18px',
            borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s',
          }} />
        </div>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          Available for new mentees
        </span>
      </label>

      {error && <p style={{ margin: 0, color: '#f87171', fontSize: '13px' }}>{error}</p>}
      {saved && <p style={{ margin: 0, color: '#4ade80', fontSize: '13px' }}>Profile saved!</p>}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg,#9b1c1c,#c0392b)',
          border: 'none', borderRadius: '12px',
          padding: '12px', fontSize: '15px',
          fontWeight: 700, color: '#fff',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? 'Saving…' : existing ? 'Update profile' : 'Register as mentor'}
      </button>
    </form>
  );
}
