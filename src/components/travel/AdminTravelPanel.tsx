'use client';

import { useState, useTransition } from 'react';
import { createTour, awardTourParticipation } from '@/lib/actions/travel';
import type { ClubTour } from '@/lib/types/travel';

interface Props {
  clubId: string;
  tours: ClubTour[];
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

function CreateTourForm({ clubId, onCreated }: { clubId: string; onCreated: (t: ClubTour) => void }) {
  const [form, setForm] = useState({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    description: '',
    base_creds_reward: 500,
    bonus_per_day: 100,
  });
  const [error, setError] = useState('');
  const [isPending, start] = useTransition();

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.destination || !form.start_date || !form.end_date) {
      setError('Please fill in all required fields'); return;
    }
    setError('');
    start(async () => {
      const result = await createTour(clubId, form);
      if (result.success) onCreated(result.data);
      else setError(result.error ?? 'Failed to create tour');
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Tour name *</label>
          <input style={inputStyle} value={form.name} onChange={field('name')} placeholder="e.g. Yorkshire Tour 2027" required />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Destination *</label>
          <input style={inputStyle} value={form.destination} onChange={field('destination')} placeholder="e.g. Leeds, West Yorkshire" required />
        </div>
        <div>
          <label style={labelStyle}>Start date *</label>
          <input type="date" style={inputStyle} value={form.start_date} onChange={field('start_date')} required />
        </div>
        <div>
          <label style={labelStyle}>End date *</label>
          <input type="date" style={inputStyle} value={form.end_date} onChange={field('end_date')} required />
        </div>
        <div>
          <label style={labelStyle}>Base Scores</label>
          <input type="number" style={inputStyle} value={form.base_creds_reward} onChange={field('base_creds_reward')} min={0} />
        </div>
        <div>
          <label style={labelStyle}>Bonus per day</label>
          <input type="number" style={inputStyle} value={form.bonus_per_day} onChange={field('bonus_per_day')} min={0} />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
            value={form.description}
            onChange={field('description')}
            placeholder="Tell players what the tour involves..."
          />
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#f87171', margin: 0 }}>{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: '10px 18px',
          borderRadius: '10px',
          border: 'none',
          background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', sans-serif",
          alignSelf: 'flex-start',
        }}
      >
        {isPending ? 'Creating…' : 'Create tour'}
      </button>
    </form>
  );
}

function AwardParticipationRow({ tour }: { tour: ClubTour }) {
  const [userId, setUserId] = useState('');
  const [days, setDays] = useState(1);
  const [msg, setMsg] = useState('');
  const [isPending, start] = useTransition();

  const tourDays = Math.round(
    (new Date(tour.end_date).getTime() - new Date(tour.start_date).getTime()) / 86_400_000
  ) + 1;

  function handleAward() {
    if (!userId.trim()) { setMsg('Enter a user ID'); return; }
    start(async () => {
      const result = await awardTourParticipation(tour.id, userId.trim(), days);
      if (result.success) setMsg(`Awarded ${result.data.creds_awarded} Scores ✓`);
      else setMsg(result.error ?? 'Error');
    });
  }

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      padding: '14px 16px',
    }}>
      <p style={{ fontWeight: 600, fontSize: '14px', color: '#fff', margin: '0 0 4px' }}>{tour.name}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
        {tour.destination} · {tour.start_date} → {tour.end_date} · {tourDays} days · Base {tour.base_creds_reward} + {tour.bonus_per_day}/day
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 3, minWidth: '160px' }}>
          <label style={labelStyle}>User ID</label>
          <input
            style={inputStyle}
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="auth user UUID"
          />
        </div>
        <div style={{ flex: 1, minWidth: '80px' }}>
          <label style={labelStyle}>Days attended</label>
          <input
            type="number"
            style={inputStyle}
            value={days}
            min={1}
            max={tourDays}
            onChange={e => setDays(Number(e.target.value))}
          />
        </div>
        <button
          onClick={handleAward}
          disabled={isPending}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            background: '#9b1c1c',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          {isPending ? '…' : 'Award Scores'}
        </button>
      </div>
      {msg && <p style={{ fontSize: '13px', color: msg.includes('✓') ? '#4ade80' : '#f87171', marginTop: '8px', marginBottom: 0 }}>{msg}</p>}
    </div>
  );
}

export function AdminTravelPanel({ clubId, tours: initialTours }: Props) {
  const [tours, setTours] = useState<ClubTour[]>(initialTours);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Create tour */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: 0 }}>
            Create a tour
          </h2>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              + New tour
            </button>
          )}
        </div>
        {showCreate && (
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '20px',
          }}>
            <CreateTourForm
              clubId={clubId}
              onCreated={(t) => {
                setTours(prev => [t, ...prev]);
                setShowCreate(false);
              }}
            />
            <button
              onClick={() => setShowCreate(false)}
              style={{
                marginTop: '10px',
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* Award participation */}
      <section>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 14px' }}>
          Award tour participation
        </h2>
        {tours.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No active tours yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tours.map(t => <AwardParticipationRow key={t.id} tour={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}
