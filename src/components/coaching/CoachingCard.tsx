'use client';

import { useState } from 'react';
import { COACHING_TYPE_CONFIG, SESSION_FORMAT_LABEL, type CoachingListing } from '@/lib/types/coaching';
import { bookSession } from '@/lib/actions/coaching';
import { formatScores } from '@/lib/utils/format';

interface Props {
  listing: CoachingListing;
  userBalance: number;
}

export function CoachingCard({ listing, userBalance }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const typeConfig = COACHING_TYPE_CONFIG[listing.coaching_type];
  const canAfford = userBalance >= listing.scores_cost;

  async function handleBook() {
    if (!date) return;
    setLoading(true);
    const res = await bookSession(listing.id, date, time || undefined);
    setLoading(false);
    if (res.success) {
      setResult({ ok: true, msg: listing.scores_cost > 0 ? `Booked! ${formatScores(res.data.scores_paid)} Scores deducted.` : 'Booked for free!' });
    } else {
      setResult({ ok: false, msg: res.error === 'insufficient_scores' ? 'Not enough Scores.' : res.error });
    }
  }

  return (
    <>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(155,28,28,0.2)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '22px', flexShrink: 0,
          }}>
            {typeConfig.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px', color: '#fff', lineHeight: 1.3 }}>
              {listing.title}
            </p>
            {listing.coach_profile && (
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                {listing.coach_profile.full_name}
                {listing.qualification && (
                  <span style={{
                    marginLeft: '6px', fontSize: '10px', fontWeight: 600,
                    background: 'rgba(201,165,76,0.15)', color: '#c9a54c',
                    border: '1px solid rgba(201,165,76,0.3)',
                    borderRadius: '4px', padding: '1px 5px',
                  }}>
                    {listing.qualification}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            {listing.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[
            typeConfig.label,
            SESSION_FORMAT_LABEL[listing.session_format],
            `${listing.duration_minutes} min`,
            listing.location ?? null,
          ].filter(Boolean).map((tag) => (
            <span key={tag} style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)',
            }}>
              {tag}
            </span>
          ))}
          {listing.session_format === 'group' && listing.max_players > 1 && (
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)',
            }}>
              Up to {listing.max_players} players
            </span>
          )}
        </div>

        {/* Rating + cost + book */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {listing.avg_rating != null && (
              <span style={{ fontSize: '12px', color: '#c9a54c' }}>
                ⭐ {listing.avg_rating.toFixed(1)}
                <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}>
                  ({listing.total_sessions_delivered})
                </span>
              </span>
            )}
            {listing.avg_rating == null && listing.total_sessions_delivered > 0 && (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                {listing.total_sessions_delivered} sessions
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: listing.scores_cost === 0 ? '#4ade80' : '#c9a54c' }}>
              {listing.scores_cost === 0 ? 'Free' : `${formatScores(listing.scores_cost)} Scores`}
            </span>
            <button
              onClick={() => setShowModal(true)}
              disabled={!canAfford && listing.scores_cost > 0}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: canAfford || listing.scores_cost === 0 ? 'pointer' : 'not-allowed',
                background: canAfford || listing.scores_cost === 0 ? '#9b1c1c' : 'rgba(255,255,255,0.08)',
                color: canAfford || listing.scores_cost === 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: '12px', fontWeight: 600,
              }}
            >
              {canAfford || listing.scores_cost === 0 ? 'Book' : 'Insufficient Scores'}
            </button>
          </div>
        </div>
      </div>

      {/* Book modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div style={{
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px',
            fontFamily: "'Inter', sans-serif",
          }}>
            <h3 style={{ margin: '0 0 4px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>
              Book Session
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
              {listing.title}
            </p>

            {result ? (
              <div style={{
                padding: '14px', borderRadius: '10px',
                background: result.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${result.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                color: result.ok ? '#4ade80' : '#f87171',
                fontSize: '14px', marginBottom: '16px', textAlign: 'center',
              }}>
                {result.msg}
              </div>
            ) : (
              <>
                <label style={{ display: 'block', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '6px' }}>
                    Session date *
                  </span>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: '6px' }}>
                    Preferred time (optional)
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBook}
                    disabled={!date || loading}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      background: date && !loading ? '#9b1c1c' : 'rgba(155,28,28,0.3)',
                      border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                      cursor: date && !loading ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {loading ? 'Booking…' : listing.scores_cost === 0 ? 'Confirm Free' : `Pay ${formatScores(listing.scores_cost)} Scores`}
                  </button>
                </div>
              </>
            )}
            {result && (
              <button
                onClick={() => { setShowModal(false); setResult(null); setDate(''); setTime(''); }}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer',
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
