'use client';

import { useState, useTransition } from 'react';
import { adminSelectTeam } from '@/lib/actions/schools';
import type { AgeGroup } from '@/lib/types/schools';
import { AGE_GROUP_CONFIG } from '@/lib/types/schools';

interface Member {
  user_id: string;
  display_name?: string | null;
  full_name?: string | null;
}

interface TeamSelectionFormProps {
  clubId: string;
  members: Member[];
  onSuccess?: () => void;
}

const AGE_GROUPS = Object.keys(AGE_GROUP_CONFIG) as AgeGroup[];

export function TeamSelectionForm({ clubId, members, onSuccess }: TeamSelectionFormProps) {
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [opposition, setOpposition] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('U15');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const togglePlayer = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!opposition.trim()) { setError('Opposition name is required.'); return; }
    if (selected.size === 0) { setError('Select at least one player.'); return; }
    startTransition(async () => {
      const res = await adminSelectTeam({
        clubId,
        matchDate,
        opposition: opposition.trim(),
        ageGroup,
        selectedPlayers: Array.from(selected),
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        setSuccess(true);
        setOpposition('');
        setSelected(new Set());
        setNotes('');
        onSuccess?.();
      } else {
        setError(res.error);
      }
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
  };

  if (success) {
    return (
      <div style={{ padding: '16px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)', fontSize: '13px', color: '#4ade80' }}>
        Team selection published — players can now see they&apos;ve been picked.{' '}
        <button onClick={() => setSuccess(false)} style={{ background: 'none', border: 'none', color: '#4ade80', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>
          Select another team
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Match date</label>
          <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Age group</label>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)} style={inputStyle}>
            {AGE_GROUPS.map((g) => <option key={g} value={g}>{AGE_GROUP_CONFIG[g].label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Opposition</label>
        <input
          type="text"
          value={opposition}
          onChange={(e) => setOpposition(e.target.value)}
          placeholder="e.g. Reading Grammar School"
          required
          style={inputStyle}
        />
      </div>

      {/* Player checklist */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={labelStyle}>Squad ({selected.size} selected)</label>
        </div>
        <div style={{
          maxHeight: '280px', overflowY: 'auto',
          background: '#111', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {members.length === 0 ? (
            <p style={{ padding: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No members found.</p>
          ) : members.map((m) => {
            const checked = selected.has(m.user_id);
            const name = m.display_name || m.full_name || m.user_id.slice(0, 8);
            return (
              <label key={m.user_id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: checked ? 'rgba(155,28,28,0.1)' : 'transparent',
              }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePlayer(m.user_id)}
                  style={{ accentColor: '#f87171', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px', color: checked ? '#fff' : 'rgba(255,255,255,0.6)' }}>{name}</span>
                {checked && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#f87171', fontWeight: 600 }}>
                    #{Array.from(selected).indexOf(m.user_id) + 1}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Coach notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Meet at pavilion 9:30am. Bring whites."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        style={{
          background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
          color: '#fff', border: 'none', borderRadius: '10px',
          padding: '10px 20px', fontSize: '13px', fontWeight: 600,
          cursor: isPending ? 'not-allowed' : 'pointer',
        }}
      >
        {isPending ? 'Publishing…' : `Publish team (${selected.size} player${selected.size !== 1 ? 's' : ''})`}
      </button>
    </form>
  );
}
