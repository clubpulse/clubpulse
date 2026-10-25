'use client';

import { useState, useTransition } from 'react';
import { nominateMember } from '@/lib/actions/infamy';
import type { InfamyCategory } from '@/lib/types/infamy';

interface ClubMember {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

interface NominateModalProps {
  clubId: string;
  categories: InfamyCategory[];
  members: ClubMember[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function NominateModal({
  clubId,
  categories,
  members,
  onClose,
  onSuccess,
}: NominateModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [nominatedUserId, setNominatedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoryId) { setError('Please select a category'); return; }
    if (!nominatedUserId) { setError('Please select a teammate'); return; }
    if (reason.trim().length < 10) { setError('Reason must be at least 10 characters'); return; }

    startTransition(async () => {
      const result = await nominateMember(categoryId, nominatedUserId, clubId, reason);
      if (result.success) {
        setSuccess(true);
        onSuccess?.();
        setTimeout(onClose, 1500);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: '16px',
          padding: '28px',
          width: '100%',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '20px',
              color: '#fff',
            }}
          >
            ☠️ Nominate a Teammate
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '20px',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {success ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 0',
              color: 'rgba(220,38,38,0.9)',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
            }}
          >
            🎯 Nomination submitted!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: categoryId ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: '#1a1a1a' }}>Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#1a1a1a' }}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teammate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Teammate
              </label>
              <select
                value={nominatedUserId}
                onChange={(e) => setNominatedUserId(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: nominatedUserId ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: '#1a1a1a' }}>Select a teammate…</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id} style={{ background: '#1a1a1a' }}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Why do they deserve this honour?
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Dropped three sitters in one over, then blamed the sun…"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  color: reason.length < 10 ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.3)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {reason.length}/10 min
              </span>
            </div>

            {error && (
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'rgba(220,38,38,0.85)',
                  fontFamily: "'Inter', sans-serif",
                  background: 'rgba(220,38,38,0.08)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: '15px',
                background: 'rgba(220,38,38,0.85)',
                color: '#fff',
                opacity: isPending ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {isPending ? 'Submitting…' : '☠️ Submit Nomination'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
