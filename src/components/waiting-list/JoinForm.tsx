'use client';

import { useState } from 'react';
import { joinWaitlist } from '@/lib/actions/waiting-list';

interface JoinFormProps {
  clubId: string;
  clubName: string;
}

export function JoinForm({ clubId, clubName }: JoinFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const result = await joinWaitlist({
      club_id: clubId,
      email: data.get('email') as string,
      full_name: data.get('full_name') as string,
      phone: (data.get('phone') as string) || undefined,
      cricket_background: (data.get('cricket_background') as string) || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setQueuePosition(result.data.position_in_queue);
  }

  if (queuePosition !== null) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(155,28,28,0.15) 0%, rgba(220,38,38,0.08) 100%)',
        border: '1px solid rgba(220,38,38,0.3)',
        borderRadius: '20px',
        padding: '40px 32px',
        textAlign: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '28px',
          color: '#fff',
          margin: '0 0 8px',
          letterSpacing: '-0.5px',
        }}>
          You&apos;re #{queuePosition} in the queue!
        </p>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', margin: '0 0 24px', lineHeight: 1.6 }}>
          We&apos;ll be in touch when a spot opens at {clubName}.<br />
          You&apos;ll earn Scores just for waiting — and a joining bonus when approved.
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.25)',
          borderRadius: '12px',
          padding: '10px 20px',
          fontSize: '13px',
          color: '#fca5a5',
          fontWeight: 500,
        }}>
          <span>500 Scores joining bonus waiting for you</span>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label htmlFor="full_name" style={labelStyle}>Full name *</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          placeholder="Your full name"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="email" style={labelStyle}>Email address *</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="phone" style={labelStyle}>Phone <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+44 7700 000000"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="cricket_background" style={labelStyle}>
          Cricket background <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
        </label>
        <textarea
          id="cricket_background"
          name="cricket_background"
          rows={3}
          placeholder="e.g. Played for XYZ CC U15s, batting all-rounder. Available weekends."
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '80px',
            lineHeight: 1.5,
          }}
        />
      </div>

      {error && (
        <p style={{
          fontSize: '13px',
          color: '#fca5a5',
          background: 'rgba(220,38,38,0.1)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '10px',
          padding: '10px 14px',
          margin: 0,
        }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: loading ? 'rgba(155,28,28,0.5)' : '#9b1c1c',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '15px',
          fontWeight: 700,
          fontFamily: "'Syne', sans-serif",
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, opacity 0.15s',
          letterSpacing: '-0.2px',
        }}
      >
        {loading ? 'Joining…' : 'Join the waiting list'}
      </button>

      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>
        No account needed. We&apos;ll only use your details to contact you about this club.
      </p>
    </form>
  );
}
