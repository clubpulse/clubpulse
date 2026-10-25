'use client';

import { useState, useTransition } from 'react';
import { adminCreateAttendanceSession } from '@/lib/actions/schools';
import { AGE_GROUP_CONFIG, AGE_GROUPS } from '@/lib/types/schools';
import type { AgeGroup, SessionType } from '@/lib/types/schools';

interface Member {
  user_id: string;
  display_name?: string | null;
  full_name?: string | null;
}

interface AttendanceFormProps {
  clubId: string;
  members: Member[];
  onSuccess?: () => void;
}

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'training', label: 'Training' },
  { value: 'match',    label: 'Match'    },
  { value: 'tour',     label: 'Tour'     },
  { value: 'other',    label: 'Other'    },
];

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', padding: '8px 12px',
  fontSize: '13px', color: '#fff',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px',
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
};

export function AttendanceForm({ clubId, members, onSuccess }: AttendanceFormProps) {
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionType, setSessionType] = useState<SessionType>('training');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('');
  const [attendees, setAttendees] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) =>
    setAttendees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await adminCreateAttendanceSession({
        clubId,
        sessionDate,
        sessionType,
        sessionName: sessionName || undefined,
        ageGroup: ageGroup || undefined,
        attendees: Array.from(attendees),
      });
      if (res.success) { setDone(true); onSuccess?.(); }
      else setError(res.error);
    });
  };

  if (done) return (
    <div style={{ padding: '14px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)', fontSize: '13px', color: '#4ade80' }}>
      Session logged.{' '}
      <button onClick={() => { setDone(false); setAttendees(new Set()); setSessionName(''); }} style={{ background: 'none', border: 'none', color: '#4ade80', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>
        Log another
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)} style={inputStyle}>
            {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Session name (optional)</label>
          <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="e.g. Tuesday nets" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Age group (optional)</label>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup | '')} style={inputStyle}>
            <option value="">All groups</option>
            {AGE_GROUPS.map((g) => <option key={g} value={g}>{AGE_GROUP_CONFIG[g].label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={labelStyle}>Attendees ({attendees.size})</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setAttendees(new Set(members.map((m) => m.user_id)))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}>All</button>
            <button type="button" onClick={() => setAttendees(new Set())} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}>Clear</button>
          </div>
        </div>
        <div style={{ maxHeight: '260px', overflowY: 'auto', background: '#111', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {members.length === 0
            ? <p style={{ padding: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No members.</p>
            : members.map((m) => {
              const checked = attendees.has(m.user_id);
              const name = m.display_name || m.full_name || m.user_id.slice(0, 8);
              return (
                <label key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: checked ? 'rgba(34,197,94,0.06)' : 'transparent' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(m.user_id)} style={{ accentColor: '#4ade80', width: '15px', height: '15px' }} />
                  <span style={{ fontSize: '13px', color: checked ? '#fff' : 'rgba(255,255,255,0.6)' }}>{name}</span>
                </label>
              );
            })}
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>}
      <button type="submit" disabled={isPending} style={{ background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer' }}>
        {isPending ? 'Saving…' : 'Log attendance'}
      </button>
    </form>
  );
}
