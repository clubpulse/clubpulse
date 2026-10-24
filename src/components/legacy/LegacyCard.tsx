'use client';

import type { PlayerLegacy } from '@/lib/types/legacy';
import { STATUS_CONFIG } from '@/lib/types/legacy';

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(155,28,28,0.6) 0%, rgba(90,10,10,0.8) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 26, fontWeight: 700, color: '#fff',
      fontFamily: "'Syne', sans-serif", flexShrink: 0,
    }}>
      {initials.toUpperCase()}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(255,255,255,0.05)', borderRadius: 8,
      padding: '6px 12px', minWidth: 52,
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
        {value.toLocaleString()}
      </span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  );
}

export function LegacyCard({ legacy }: { legacy: PlayerLegacy }) {
  const cfg = STATUS_CONFIG[legacy.status];
  const isLegend = legacy.status === 'legend';

  return (
    <article style={{
      background: isLegend
        ? 'linear-gradient(135deg, rgba(20,16,0,0.95) 0%, rgba(30,22,2,0.95) 100%)'
        : 'rgba(255,255,255,0.04)',
      border: isLegend ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 16,
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      boxShadow: isLegend ? '0 0 32px rgba(212,175,55,0.08)' : 'none',
    }}>
      {isLegend && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent)',
        }} />
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {legacy.photo_url ? (
          <img
            src={legacy.photo_url} alt={legacy.display_name}
            width={72} height={72}
            style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
              border: isLegend ? '2px solid rgba(212,175,55,0.5)' : '2px solid rgba(255,255,255,0.1)' }}
          />
        ) : (
          <Initials name={legacy.display_name} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.3px' }}>
              {legacy.display_name}
            </h3>
            {legacy.nickname && (
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                &ldquo;{legacy.nickname}&rdquo;
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            {legacy.primary_role}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: isLegend ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.07)',
              color: isLegend ? 'rgba(212,175,55,0.9)' : 'rgba(255,255,255,0.5)',
              letterSpacing: '0.04em',
            }}>
              {cfg.emoji} {cfg.label}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{legacy.years_at_club}</span>
          </div>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
        {legacy.career_summary}
      </p>

      {legacy.career_highlight && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderLeft: `3px solid ${isLegend ? 'rgba(212,175,55,0.6)' : 'rgba(155,28,28,0.6)'}`,
          borderRadius: '0 8px 8px 0', padding: '8px 12px',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Career highlight
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{legacy.career_highlight}</p>
        </div>
      )}

      {(legacy.total_matches != null || legacy.total_runs != null || legacy.total_wickets != null) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {legacy.total_matches != null && <StatChip label="Matches" value={legacy.total_matches} />}
          {legacy.total_runs != null && <StatChip label="Runs" value={legacy.total_runs} />}
          {legacy.total_wickets != null && <StatChip label="Wickets" value={legacy.total_wickets} />}
        </div>
      )}

      {legacy.best_season && (
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>Best season:</span>
          {legacy.best_season}
        </p>
      )}

      {legacy.honours && legacy.honours.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {legacy.honours.map((h) => (
            <span key={h} style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 20,
              background: isLegend ? 'rgba(212,175,55,0.1)' : 'rgba(155,28,28,0.15)',
              color: isLegend ? 'rgba(212,175,55,0.85)' : 'rgba(252,165,165,0.8)',
              border: isLegend ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(155,28,28,0.3)',
            }}>
              🏅 {h}
            </span>
          ))}
        </div>
      )}

      {legacy.quote && (
        <blockquote style={{
          margin: '4px 0 0', padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: 'none',
          fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
        }}>
          &ldquo;{legacy.quote}&rdquo;
        </blockquote>
      )}
    </article>
  );
}
