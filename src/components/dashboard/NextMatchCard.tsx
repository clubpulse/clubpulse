'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { setAvailability } from '@/lib/actions/availability';
import type { AvailabilityStatus, FixtureWithMyStatus } from '@/lib/types/availability';

const FORMAT: Record<string, string> = { league: 'League match', cup: 'Cup match', friendly: 'Friendly', tour: 'Tour match' };

function when(date: string, time: string | null): { day: string; time: string | null } {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  if (!time) return { day, time: null };
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { day, time: `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` };
}

// The next fixture, with one tap to say you can play. Shown at the top of Home.
// canPlay is false for parents and volunteers, who see the fixture without the availability buttons.
export function NextMatchCard({ fixture, clubName, canPlay = true }: { fixture: FixtureWithMyStatus | null; clubName: string; canPlay?: boolean }) {
  const [status, setStatus] = useState<AvailabilityStatus>(fixture?.my_status ?? 'unknown');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const shell: React.CSSProperties = {
    borderRadius: '20px',
    padding: '26px 28px',
    background: 'linear-gradient(120deg, #1D4ED8 0%, #1E3A8A 55%, #172554 100%)',
    border: '1px solid rgba(96,165,250,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap',
  };
  const eyebrow: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#93C5FD', margin: '0 0 6px' };
  const title: React.CSSProperties = {
    fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 'clamp(22px, 3.4vw, 34px)', color: '#fff', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1,
  };
  const sub: React.CSSProperties = { fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '8px 0 0' };
  const ghost: React.CSSProperties = {
    padding: '11px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
    background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', fontFamily: 'inherit',
  };

  if (!fixture) {
    return (
      <section style={shell} aria-label="Next match">
        <div>
          <p style={eyebrow}>Next match</p>
          <h2 style={title}>No fixtures yet</h2>
          <p style={sub}>Your club has not added its next match.</p>
        </div>
        <Link href="/availability" style={ghost}>See fixtures</Link>
      </section>
    );
  }

  const { day, time } = when(fixture.match_date, fixture.match_time);
  const details = [time, fixture.venue, FORMAT[fixture.format] ?? null].filter(Boolean).join(' · ');
  const available = status === 'available';

  function choose(next: AvailabilityStatus) {
    const before = status;
    setError('');
    setStatus(next);
    startTransition(async () => {
      const res = await setAvailability(fixture!.id, next);
      if (!res.success) {
        setStatus(before);
        setError('Could not save. Please try again.');
      }
    });
  }

  return (
    <section style={shell} aria-label="Next match">
      <div style={{ minWidth: 0 }}>
        <p style={eyebrow}>Next match · {day}</p>
        <h2 style={title}>{clubName} v {fixture.opponent}</h2>
        {details && <p style={sub}>{details}</p>}
        {error && <p role="alert" style={{ ...sub, color: '#FCA5A5' }}>{error}</p>}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {canPlay && (
          <>
            <button
              type="button"
              onClick={() => choose(available ? 'unknown' : 'available')}
              disabled={pending}
              aria-pressed={available}
              style={{
                ...ghost,
                background: available ? '#22C55E' : '#fff',
                color: available ? '#052E16' : '#1E3A8A',
                border: 'none',
                opacity: pending ? 0.7 : 1,
              }}
            >
              {available ? '✓ You are available' : "I'm available"}
            </button>
            {!available && (
              <button type="button" onClick={() => choose('unavailable')} disabled={pending} aria-pressed={status === 'unavailable'} style={ghost}>
                {status === 'unavailable' ? "✗ Can't play" : "Can't play"}
              </button>
            )}
          </>
        )}
        <Link href={canPlay ? '/availability' : '/match-day'} style={ghost}>{canPlay ? "Who's playing" : 'Match details'}</Link>
      </div>
    </section>
  );
}
