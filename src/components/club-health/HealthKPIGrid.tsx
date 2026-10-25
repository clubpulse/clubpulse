'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClubHealthMetrics, HealthScore } from '@/lib/types/club-health';

interface Props {
  metrics: ClubHealthMetrics;
}

function getAvailabilityStatus(rate: number): HealthScore['status'] {
  if (rate >= 70) return 'good';
  if (rate >= 40) return 'warning';
  return 'critical';
}

function getInjuryStatus(count: number): HealthScore['status'] {
  if (count === 0) return 'good';
  if (count <= 2) return 'warning';
  return 'critical';
}

const STATUS_STYLES: Record<HealthScore['status'], { bg: string; badge: string; badgeBg: string; label: string }> = {
  good: {
    bg: 'rgba(52,211,153,0.05)',
    badge: '#34d399',
    badgeBg: 'rgba(52,211,153,0.12)',
    label: 'Healthy',
  },
  warning: {
    bg: 'rgba(245,158,11,0.05)',
    badge: '#f59e0b',
    badgeBg: 'rgba(245,158,11,0.12)',
    label: 'Watch',
  },
  critical: {
    bg: 'rgba(248,113,113,0.05)',
    badge: '#f87171',
    badgeBg: 'rgba(248,113,113,0.12)',
    label: 'Alert',
  },
  info: {
    bg: 'rgba(99,102,241,0.05)',
    badge: '#818cf8',
    badgeBg: 'rgba(99,102,241,0.12)',
    label: 'Info',
  },
};

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

interface KPITileProps {
  icon: string;
  label: string;
  rawValue: number;
  displayValue?: string;
  unit?: string;
  status: HealthScore['status'];
  animate?: boolean;
}

function KPITile({ icon, label, rawValue, displayValue, unit, status }: KPITileProps) {
  const counted = useCountUp(rawValue);
  const styles = STATUS_STYLES[status];
  const shown = displayValue ?? String(counted);

  return (
    <div
      style={{
        background: styles.bg,
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: styles.badge,
            background: styles.badgeBg,
            borderRadius: '6px',
            padding: '3px 8px',
          }}
        >
          {styles.label}
        </span>
      </div>

      {/* Big number */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '40px',
              color: '#fff',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {shown}
          </span>
          {unit && (
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              {unit}
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            margin: '6px 0 0',
            fontWeight: 500,
            letterSpacing: '0.2px',
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

export function HealthKPIGrid({ metrics }: Props) {
  const availRate = Number(metrics.availability_rate ?? 0);

  const tiles: KPITileProps[] = [
    {
      icon: '👥',
      label: 'Total Members',
      rawValue: metrics.total_members,
      status: 'info',
    },
    {
      icon: '💰',
      label: 'Total Scores in Club',
      rawValue: metrics.total_scores,
      status: 'info',
      unit: 'pts',
    },
    {
      icon: '✅',
      label: 'Availability Response Rate',
      rawValue: availRate,
      displayValue: `${availRate.toFixed(1)}`,
      unit: '%',
      status: getAvailabilityStatus(availRate),
    },
    {
      icon: '💬',
      label: 'Dressing Room Posts (30d)',
      rawValue: metrics.dressing_room_posts_30d,
      status: 'info',
    },
    {
      icon: '🏏',
      label: 'Fixtures (90d)',
      rawValue: metrics.fixtures_90d,
      status: 'info',
    },
    {
      icon: '🩹',
      label: 'Active Injuries (anonymous)',
      rawValue: metrics.active_injuries,
      status: getInjuryStatus(metrics.active_injuries),
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
      }}
    >
      {tiles.map((tile) => (
        <KPITile key={tile.label} {...tile} />
      ))}
    </div>
  );
}
