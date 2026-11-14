'use client';

import { useState, useTransition } from 'react';
import { setAvailability } from '@/lib/actions/availability';
import type { AvailabilityStatus, FixtureWithMyStatus } from '@/lib/types/availability';

const STATUS_BUTTONS: { status: AvailabilityStatus; label: string; icon: string; activeStyle: React.CSSProperties; activeClass: string }[] = [
  {
    status: 'available',
    label: 'Available',
    icon: '✅',
    activeStyle: { background: 'rgba(22,163,74,0.2)', borderColor: '#16a34a', color: '#4ade80' },
    activeClass: '',
  },
  {
    status: 'unavailable',
    label: "Can't make it",
    icon: '❌',
    activeStyle: { background: 'rgba(220,38,38,0.2)', borderColor: '#dc2626', color: '#f87171' },
    activeClass: '',
  },
  {
    status: 'maybe',
    label: 'Maybe',
    icon: '🤔',
    activeStyle: { background: 'rgba(217,119,6,0.2)', borderColor: '#d97706', color: '#fbbf24' },
    activeClass: '',
  },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

const FORMAT_LABELS: Record<string, string> = {
  league: 'League',
  cup: 'Cup',
  friendly: 'Friendly',
  tour: 'Tour',
};

export function AvailabilityCard({ fixture }: { fixture: FixtureWithMyStatus }) {
  const [currentStatus, setCurrentStatus] = useState<AvailabilityStatus>(fixture.my_status);
  const [isPending, startTransition] = useTransition();

  function handleStatus(status: AvailabilityStatus) {
    if (isPending) return;
    const prev = currentStatus;
    setCurrentStatus(status); // optimistic
    startTransition(async () => {
      const result = await setAvailability(fixture.id, status);
      if (!result.success) {
        setCurrentStatus(prev); // rollback
      }
    });
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: "'Inter', sans-serif",
        opacity: isPending ? 0.75 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {FORMAT_LABELS[fixture.format] ?? fixture.format}
          </p>
          <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
            vs {fixture.opponent}
          </h3>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
            {formatDate(fixture.match_date)}
          </p>
          {fixture.match_time && (
            <p style={{ margin: '1px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {formatTime(fixture.match_time)}
            </p>
          )}
        </div>
      </div>

      {fixture.venue && (
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          📍 {fixture.venue}
        </p>
      )}

      {/* Status buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {STATUS_BUTTONS.map(({ status, label, icon, activeStyle }) => {
          const isActive = currentStatus === status;
          return (
            <button
              key={status}
              onClick={() => handleStatus(status)}
              disabled={isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 6px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: isActive ? (activeStyle.borderColor as string) : 'rgba(255,255,255,0.1)',
                background: isActive ? (activeStyle.background as string) : 'rgba(255,255,255,0.03)',
                color: isActive ? (activeStyle.color as string) : 'rgba(255,255,255,0.35)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <span style={{ fontSize: '18px' }}>{icon}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
