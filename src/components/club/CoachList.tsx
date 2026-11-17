'use client';

import { useState } from 'react';
import { card, cardTitle, muted } from '@/components/play/ui';
import type { CoachWithProfile } from '@/lib/admin/coach-service';
import { CERT_LABELS } from '@/lib/types/coach';

interface Props {
  clubId: string;
  coaches: CoachWithProfile[];
}

export function CoachList({ clubId, coaches: initial }: Props) {
  const [coaches, setCoaches] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const pending = coaches.filter((c) => !c.is_approved);
  const approved = coaches.filter((c) => c.is_approved);

  async function handleAction(coachId: string, action: 'approve' | 'reject') {
    setLoading(coachId);
    setMessage(null);
    try {
      const res = await fetch('/api/club/coaches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId, coach_profile_id: coachId, action }),
      });
      const json = await res.json();
      if (json.success) {
        setCoaches((prev) =>
          prev.map((c) =>
            c.id === coachId ? { ...c, is_approved: action === 'approve' } : c,
          ),
        );
        setMessage({ id: coachId, text: action === 'approve' ? 'Approved' : 'Rejected', ok: true });
      } else {
        setMessage({ id: coachId, text: json.error ?? 'Failed', ok: false });
      }
    } catch {
      setMessage({ id: coachId, text: 'Network error', ok: false });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Pending approval */}
      {pending.length > 0 && (
        <div style={card}>
          <p style={cardTitle}>⏳ Pending approval ({pending.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {pending.map((coach) => (
              <div
                key={coach.id}
                style={{
                  background: 'rgba(234,179,8,0.06)',
                  border: '1px solid rgba(234,179,8,0.15)',
                  borderRadius: '12px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                      {coach.full_name ?? coach.display_name ?? 'Coach'}
                    </p>
                    <p style={muted}>
                      {coach.specialisations.length > 0
                        ? coach.specialisations.join(', ')
                        : 'No specialisations listed'}
                      {coach.experience_years > 0 && ` · ${coach.experience_years}yr experience`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleAction(coach.id, 'approve')}
                      disabled={loading === coach.id}
                      style={actionBtn('#166534', loading === coach.id)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleAction(coach.id, 'reject')}
                      disabled={loading === coach.id}
                      style={actionBtn('#7f1d1d', loading === coach.id)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
                {message?.id === coach.id && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: message.ok ? '#4ade80' : '#f87171' }}>
                    {message.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved coaches */}
      <div style={card}>
        <p style={cardTitle}>✅ Active coaches ({approved.length})</p>
        {approved.length === 0 ? (
          <p style={{ ...muted, marginTop: '12px' }}>No approved coaches yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {approved.map((coach) => (
              <div
                key={coach.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '13px', color: '#fff' }}>
                    {coach.full_name ?? coach.display_name ?? 'Coach'}
                  </p>
                  <p style={{ ...muted, fontSize: '11px' }}>
                    {coach.specialisations.join(', ') || 'General'}
                    {' · '}
                    {coach.total_sessions} session{coach.total_sessions !== 1 ? 's' : ''}
                    {coach.avg_rating != null && ` · ⭐ ${coach.avg_rating}`}
                    {!coach.is_visible && ' · Hidden'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {coach.certifications_count > 0 && (
                    <span style={{ fontSize: '11px', color: '#4ade80' }}>
                      🎓 {coach.certifications_count} cert{coach.certifications_count !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={() => handleAction(coach.id, 'reject')}
                    disabled={loading === coach.id}
                    style={{
                      ...actionBtn('#7f1d1d', loading === coach.id),
                      fontSize: '11px',
                      padding: '4px 10px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function actionBtn(bg: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: '8px',
    border: 'none',
    background: disabled ? 'rgba(255,255,255,0.08)' : bg,
    color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
