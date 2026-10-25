'use client';

import { useState } from 'react';
import type { MentorProfile } from '@/lib/types/mentor';
import { requestMentor } from '@/lib/actions/mentor';

const SPECIALITY_LABELS: Record<string, string> = {
  batting: '🏏 Batting',
  bowling: '🎯 Bowling',
  fielding: '🧤 Fielding',
  wicketkeeping: '🧤 Keeping',
  allround: '⚡ All-round',
};

const STYLE_LABELS: Record<string, string> = {
  'right-hand': 'RHB',
  'left-hand': 'LHB',
  'right-arm-fast': 'RAF',
  'right-arm-medium': 'RAM',
  'right-arm-spin': 'RAS',
  'left-arm-fast': 'LAF',
  'left-arm-medium': 'LAM',
  'left-arm-spin': 'LAS',
  none: '—',
};

interface Props {
  mentor: MentorProfile;
  clubId: string;
  alreadyRequested?: boolean;
}

export function MentorCard({ mentor, clubId, alreadyRequested = false }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(alreadyRequested);
  const [error, setError] = useState('');

  const name = mentor.profile?.full_name ?? 'Mentor';
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  async function handleRequest() {
    setLoading(true);
    setError('');
    const res = await requestMentor(mentor.user_id, clubId, message || undefined);
    setLoading(false);
    if (res.success) {
      setSent(true);
      setModalOpen(false);
    } else {
      setError(res.error);
    }
  }

  return (
    <>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#9b1c1c,#c0392b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', fontFamily: "'Syne',sans-serif" }}>
              {name}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
              {mentor.years_experience}y experience
            </div>
          </div>
          {mentor.speciality && (
            <span style={{
              background: 'rgba(155,28,28,0.25)',
              border: '1px solid rgba(155,28,28,0.4)',
              borderRadius: '20px',
              padding: '3px 10px',
              fontSize: '11px',
              color: '#f87171',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              {SPECIALITY_LABELS[mentor.speciality] ?? mentor.speciality}
            </span>
          )}
        </div>

        {/* Style pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {mentor.batting_style && (
            <span style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: '8px',
              padding: '3px 9px', fontSize: '11px', color: 'rgba(255,255,255,0.6)',
            }}>
              Bat: {STYLE_LABELS[mentor.batting_style] ?? mentor.batting_style}
            </span>
          )}
          {mentor.bowling_style && mentor.bowling_style !== 'none' && (
            <span style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: '8px',
              padding: '3px 9px', fontSize: '11px', color: 'rgba(255,255,255,0.6)',
            }}>
              Bowl: {STYLE_LABELS[mentor.bowling_style] ?? mentor.bowling_style}
            </span>
          )}
        </div>

        {/* Bio */}
        {mentor.bio && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
            {mentor.bio}
          </p>
        )}

        {/* Stats + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              ⭐ {mentor.avg_rating != null ? mentor.avg_rating.toFixed(1) : '—'}
            </span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              {mentor.total_sessions} sessions
            </span>
          </div>
          <button
            onClick={() => !sent && setModalOpen(true)}
            disabled={sent}
            style={{
              background: sent ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#9b1c1c,#c0392b)',
              border: 'none', borderRadius: '10px',
              padding: '8px 16px', fontSize: '13px',
              fontWeight: 600, color: sent ? 'rgba(255,255,255,0.35)' : '#fff',
              cursor: sent ? 'default' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {sent ? 'Requested' : 'Request'}
          </button>
        </div>
      </div>

      {/* Request modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }} onClick={() => setModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif" }}>
              Request {name} as mentor
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell them a bit about yourself and what you want to work on (optional)"
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px', padding: '12px',
                fontSize: '14px', color: '#fff', resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
              }}
            />
            {error && <p style={{ margin: 0, color: '#f87171', fontSize: '13px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px', padding: '9px 18px',
                  fontSize: '14px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequest}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg,#9b1c1c,#c0392b)',
                  border: 'none', borderRadius: '10px',
                  padding: '9px 18px', fontSize: '14px',
                  fontWeight: 600, color: '#fff',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
