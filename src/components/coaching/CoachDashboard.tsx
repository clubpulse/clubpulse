'use client';

import { useState } from 'react';
import { COACHING_TYPE_CONFIG, BOOKING_STATUS_LABEL, type CoachingBooking } from '@/lib/types/coaching';
import { completeSession, updateBookingStatus } from '@/lib/actions/coaching';
import { formatScores } from '@/lib/utils/format';

interface Props {
  bookings: CoachingBooking[];
  totalScoresEarned: number;
}

export function CoachDashboard({ bookings, totalScoresEarned }: Props) {
  const [localBookings, setLocalBookings] = useState(bookings);
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const pending = localBookings.filter((b) => b.status === 'pending');
  const confirmed = localBookings.filter((b) => b.status === 'confirmed');
  const completed = localBookings.filter((b) => b.status === 'completed');

  const avgRating = completed.filter((b) => b.player_rating != null).length > 0
    ? (completed.reduce((s, b) => s + (b.player_rating ?? 0), 0) / completed.filter((b) => b.player_rating != null).length).toFixed(1)
    : null;

  async function handleStatus(bookingId: string, status: 'confirmed' | 'cancelled') {
    setLoading(bookingId);
    const res = await updateBookingStatus(bookingId, status);
    setLoading(null);
    if (res.success) {
      setLocalBookings((bs) => bs.map((b) => b.id === bookingId ? { ...b, status } : b));
    } else {
      setMessages((m) => ({ ...m, [bookingId]: res.error }));
    }
  }

  async function handleComplete(bookingId: string) {
    setLoading(bookingId);
    const res = await completeSession(bookingId, notesInput[bookingId]);
    setLoading(null);
    if (res.success) {
      setLocalBookings((bs) => bs.map((b) => b.id === bookingId ? { ...b, status: 'completed' } : b));
      setMessages((m) => ({ ...m, [bookingId]: `✓ Completed! You earned ${formatScores(res.data.coach_creds_earned)} Scores.` }));
    } else {
      setMessages((m) => ({ ...m, [bookingId]: res.error }));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {[
          { label: 'Sessions delivered', value: completed.length },
          { label: 'Avg rating', value: avgRating ? `⭐ ${avgRating}` : '—' },
          { label: 'Scores earned', value: formatScores(totalScoresEarned) },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '14px', textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#c9a54c' }}>{value}</p>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <Section title={`Pending Requests (${pending.length})`}>
          {pending.map((b) => (
            <BookingRow key={b.id} booking={b} message={messages[b.id]}>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <ActionBtn
                  label="Accept"
                  color="#166534"
                  loading={loading === b.id}
                  onClick={() => handleStatus(b.id, 'confirmed')}
                />
                <ActionBtn
                  label="Decline"
                  color="#7f1d1d"
                  loading={loading === b.id}
                  onClick={() => handleStatus(b.id, 'cancelled')}
                />
              </div>
            </BookingRow>
          ))}
        </Section>
      )}

      {/* Upcoming confirmed */}
      {confirmed.length > 0 && (
        <Section title={`Upcoming (${confirmed.length})`}>
          {confirmed.map((b) => (
            <BookingRow key={b.id} booking={b} message={messages[b.id]}>
              <div style={{ marginTop: '10px' }}>
                <textarea
                  placeholder="Optional coach notes…"
                  rows={2}
                  value={notesInput[b.id] ?? ''}
                  onChange={(e) => setNotesInput((n) => ({ ...n, [b.id]: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: '8px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: '12px', resize: 'vertical', fontFamily: "'Inter', sans-serif",
                    marginBottom: '8px',
                  }}
                />
                <ActionBtn
                  label="Mark Complete"
                  color="#1e3a5f"
                  loading={loading === b.id}
                  onClick={() => handleComplete(b.id)}
                />
              </div>
            </BookingRow>
          ))}
        </Section>
      )}

      {/* Completed history */}
      {completed.length > 0 && (
        <Section title={`Completed (${completed.length})`}>
          {completed.map((b) => (
            <BookingRow key={b.id} booking={b} message={messages[b.id]}>
              {b.player_rating != null && (
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#c9a54c' }}>
                  ⭐ {b.player_rating}/5{b.player_feedback ? ` — "${b.player_feedback}"` : ''}
                </p>
              )}
            </BookingRow>
          ))}
        </Section>
      )}

      {pending.length === 0 && confirmed.length === 0 && completed.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.35)', padding: '32px 0' }}>
          No bookings yet. Create a listing to start receiving requests.
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 style={{ margin: '0 0 12px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
    </section>
  );
}

function BookingRow({ booking, message, children }: { booking: CoachingBooking; message?: string; children?: React.ReactNode }) {
  const typeConfig = booking.listing ? COACHING_TYPE_CONFIG[booking.listing.coaching_type] : null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px', padding: '14px',
    }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {typeConfig && (
          <span style={{ fontSize: '18px', marginTop: '2px' }}>{typeConfig.emoji}</span>
        )}
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '13px', color: '#fff' }}>
            {booking.listing?.title ?? 'Session'}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
            {booking.session_date}
            {booking.session_time ? ` at ${booking.session_time}` : ''}
            {' · '}
            <span style={{ color: statusColor(booking.status) }}>{BOOKING_STATUS_LABEL[booking.status]}</span>
            {booking.scores_paid > 0 && (
              <span style={{ marginLeft: '6px', color: '#c9a54c' }}>· {formatScores(booking.scores_paid)} Scores paid</span>
            )}
          </p>
        </div>
      </div>
      {message && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: message.startsWith('✓') ? '#4ade80' : '#f87171' }}>{message}</p>
      )}
      {children}
    </div>
  );
}

function ActionBtn({ label, color, loading, onClick }: { label: string; color: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '6px 14px', borderRadius: '8px', border: 'none',
        background: loading ? 'rgba(255,255,255,0.08)' : color,
        color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
        fontSize: '12px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? '…' : label}
    </button>
  );
}

function statusColor(status: string) {
  if (status === 'confirmed') return '#4ade80';
  if (status === 'completed') return '#60a5fa';
  if (status === 'cancelled' || status === 'no_show') return '#f87171';
  return 'rgba(255,255,255,0.5)';
}
