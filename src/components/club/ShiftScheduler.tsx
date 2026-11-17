'use client';

import { useState, useCallback } from 'react';
import type { ShiftWithSignups, ShiftRole } from '@/lib/types/volunteer-shifts';
import { SHIFT_ROLE_LABELS, SIGNUP_STATUS_LABELS, formatTime, shiftDurationHours } from '@/lib/types/volunteer-shifts';
import { card, cardTitle, muted, primaryBtn, input as inputStyle } from '@/components/play/ui';

interface Props {
  initialShifts: ShiftWithSignups[];
}

export default function ShiftScheduler({ initialShifts }: Props) {
  const [shifts, setShifts] = useState(initialShifts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<ShiftRole>('general');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [maxVol, setMaxVol] = useState(2);
  const [bonus, setBonus] = useState(0);
  const [critical, setCritical] = useState(false);
  const [desc, setDesc] = useState('');

  const reload = useCallback(async () => {
    const res = await fetch('/api/club/volunteers/shifts');
    if (res.ok) {
      const data = await res.json();
      setShifts(data.shifts ?? []);
    }
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/club/volunteers/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, role, shift_date: shiftDate,
          start_time: startTime, end_time: endTime,
          location: location || undefined,
          max_volunteers: maxVol, scores_bonus: bonus,
          is_critical: critical,
          description: desc || undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setTitle(''); setDesc(''); setLocation('');
        setShiftDate(''); setStartTime('09:00'); setEndTime('12:00');
        setMaxVol(2); setBonus(0); setCritical(false); setRole('general');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSignupAction = async (signupId: string, action: 'checkout' | 'no_show' | 'cancel') => {
    setActing(signupId);
    try {
      await fetch('/api/club/volunteers/signups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId, action }),
      });
      await reload();
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm('Delete this shift?')) return;
    setActing(shiftId);
    try {
      await fetch(`/api/club/volunteers/shifts?id=${shiftId}`, { method: 'DELETE' });
      await reload();
    } finally {
      setActing(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = shifts.filter(s => s.shift_date >= today);
  const past = shifts.filter(s => s.shift_date < today);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Create button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={primaryBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Shift'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={card}>
          <h3 style={cardTitle}>Create Shift</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={muted}>Title</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Match Day Scoring" />
            </div>
            <div>
              <label style={muted}>Role</label>
              <select style={inputStyle} value={role} onChange={e => setRole(e.target.value as ShiftRole)}>
                {Object.entries(SHIFT_ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={muted}>Date</label>
              <input style={inputStyle} type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
            </div>
            <div>
              <label style={muted}>Start Time</label>
              <input style={inputStyle} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label style={muted}>End Time</label>
              <input style={inputStyle} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <div>
              <label style={muted}>Location</label>
              <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="Main Ground" />
            </div>
            <div>
              <label style={muted}>Max Volunteers</label>
              <input style={inputStyle} type="number" min={1} value={maxVol} onChange={e => setMaxVol(Number(e.target.value))} />
            </div>
            <div>
              <label style={muted}>Bonus Scores</label>
              <input style={inputStyle} type="number" min={0} step={50} value={bonus} onChange={e => setBonus(Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={critical} onChange={e => setCritical(e.target.checked)} />
              <label style={muted}>Critical shift</label>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={muted}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: '3rem' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional details..." />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button style={primaryBtn} onClick={handleCreate} disabled={saving || !title || !shiftDate}>
              {saving ? 'Creating...' : 'Create Shift'}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Shifts */}
      <h3 style={{ ...cardTitle, marginTop: '0.5rem' }}>Upcoming Shifts ({upcoming.length})</h3>
      {upcoming.length === 0 && <p style={muted}>No upcoming shifts scheduled.</p>}
      {upcoming.map(shift => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          expanded={expanded === shift.id}
          onToggle={() => setExpanded(expanded === shift.id ? null : shift.id)}
          onAction={handleSignupAction}
          onDelete={handleDelete}
          acting={acting}
        />
      ))}

      {/* Past Shifts */}
      {past.length > 0 && (
        <>
          <h3 style={{ ...cardTitle, marginTop: '1rem' }}>Past Shifts ({past.length})</h3>
          {past.map(shift => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              expanded={expanded === shift.id}
              onToggle={() => setExpanded(expanded === shift.id ? null : shift.id)}
              onAction={handleSignupAction}
              onDelete={handleDelete}
              acting={acting}
              isPast
            />
          ))}
        </>
      )}
    </div>
  );
}

function ShiftCard({
  shift, expanded, onToggle, onAction, onDelete, acting, isPast,
}: {
  shift: ShiftWithSignups;
  expanded: boolean;
  onToggle: () => void;
  onAction: (id: string, action: 'checkout' | 'no_show' | 'cancel') => void;
  onDelete: (id: string) => void;
  acting: string | null;
  isPast?: boolean;
}) {
  const duration = shiftDurationHours(shift.start_time, shift.end_time);
  const fillPercent = shift.max_volunteers > 0
    ? Math.round((shift.signup_count / shift.max_volunteers) * 100)
    : 0;
  const fillColor = fillPercent >= 100 ? '#00C853' : fillPercent >= 50 ? '#EFC84A' : '#ff5252';

  return (
    <div style={card}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {shift.is_critical && <span title="Critical">🔴</span>}
          <div>
            <div style={{ fontWeight: 600, color: '#fff' }}>{shift.title}</div>
            <div style={muted}>
              {SHIFT_ROLE_LABELS[shift.role]} · {shift.shift_date} · {formatTime(shift.start_time)}–{formatTime(shift.end_time)} ({duration}h)
              {shift.location ? ` · ${shift.location}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {shift.scores_bonus > 0 && (
            <span style={{ color: '#EFC84A', fontSize: '0.85rem' }}>+{shift.scores_bonus} ⭐</span>
          )}
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: fillColor, fontWeight: 600 }}>
              {shift.signup_count}/{shift.max_volunteers}
            </span>
            <div style={muted}>{shift.spots_remaining} spot{shift.spots_remaining !== 1 ? 's' : ''} left</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
          {shift.description && <p style={{ ...muted, marginBottom: '0.5rem' }}>{shift.description}</p>}

          {shift.signups.length === 0 ? (
            <p style={muted}>No sign-ups yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '0.4rem 0', color: 'rgba(255,255,255,0.5)' }}>Volunteer</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem 0', color: 'rgba(255,255,255,0.5)' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem 0', color: 'rgba(255,255,255,0.5)' }}>Hours</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem 0', color: 'rgba(255,255,255,0.5)' }}>Scores</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem 0', color: 'rgba(255,255,255,0.5)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shift.signups.map(su => {
                  const canCheckout = ['signed_up', 'confirmed', 'checked_in'].includes(su.status);
                  const canNoShow = ['signed_up', 'confirmed'].includes(su.status);
                  const isActing = acting === su.id;
                  return (
                    <tr key={su.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.4rem 0', color: '#fff' }}>{su.user_name}</td>
                      <td style={{ padding: '0.4rem 0' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem',
                          background: su.status === 'completed' ? 'rgba(0,200,83,0.15)' :
                            su.status === 'no_show' ? 'rgba(255,82,82,0.15)' : 'rgba(255,255,255,0.08)',
                          color: su.status === 'completed' ? '#00C853' :
                            su.status === 'no_show' ? '#ff5252' : 'rgba(255,255,255,0.7)',
                        }}>
                          {SIGNUP_STATUS_LABELS[su.status]}
                        </span>
                      </td>
                      <td style={{ padding: '0.4rem 0', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                        {su.hours_logged != null ? `${su.hours_logged}h` : '—'}
                      </td>
                      <td style={{ padding: '0.4rem 0', textAlign: 'right', color: '#EFC84A' }}>
                        {su.scores_earned > 0 ? `+${su.scores_earned}` : '—'}
                      </td>
                      <td style={{ padding: '0.4rem 0', textAlign: 'right' }}>
                        {canCheckout && (
                          <button
                            style={{ ...smallBtn, background: 'rgba(0,200,83,0.15)', color: '#00C853' }}
                            disabled={isActing}
                            onClick={() => onAction(su.id, 'checkout')}
                          >✓ Complete</button>
                        )}
                        {canNoShow && (
                          <button
                            style={{ ...smallBtn, background: 'rgba(255,82,82,0.15)', color: '#ff5252', marginLeft: 4 }}
                            disabled={isActing}
                            onClick={() => onAction(su.id, 'no_show')}
                          >✗ No Show</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!isPast && (
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{ ...smallBtn, background: 'rgba(255,82,82,0.15)', color: '#ff5252' }}
                disabled={acting === shift.id}
                onClick={() => onDelete(shift.id)}
              >Delete Shift</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
};
