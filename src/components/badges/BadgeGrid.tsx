'use client';

import type { Badge, PlayerBadge } from '@/lib/types/badges';
import { RARITY_CONFIG } from '@/lib/types/badges';

interface BadgeGridProps {
  badges: Badge[];
  earned: PlayerBadge[];
}

export function BadgeGrid({ badges, earned }: BadgeGridProps) {
  const earnedMap = new Map<string, PlayerBadge>(
    earned.map((pb) => [pb.badge_id, pb]),
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
      }}
    >
      {badges.map((badge) => {
        const playerBadge = earnedMap.get(badge.id);
        const isEarned = Boolean(playerBadge);
        const rarity = RARITY_CONFIG[badge.rarity];
        const isLegendary = badge.rarity === 'legendary';

        return (
          <div
            key={badge.id}
            title={
              isEarned
                ? `${badge.name}\n${badge.description}${
                    playerBadge?.awarded_at
                      ? `\nAwarded ${new Date(playerBadge.awarded_at).toLocaleDateString()}`
                      : ''
                  }${playerBadge?.awarded_reason ? `\n${playerBadge.awarded_reason}` : ''}`
                : `${badge.name} (locked)\n${badge.description}`
            }
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 8px',
              borderRadius: '12px',
              border: isEarned
                ? isLegendary
                  ? '2px solid #f59e0b'
                  : badge.rarity === 'epic'
                  ? '2px solid #a855f7'
                  : badge.rarity === 'rare'
                  ? '2px solid #3b82f6'
                  : '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(255,255,255,0.06)',
              background: isEarned
                ? isLegendary
                  ? 'rgba(245,158,11,0.08)'
                  : 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.02)',
              filter: isEarned ? 'none' : 'grayscale(1) opacity(0.35)',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden',
              animation: isEarned && isLegendary ? 'legendaryGlow 2s ease-in-out infinite alternate' : 'none',
            }}
          >
            {/* Legendary glow pulse behind emoji */}
            {isEarned && isLegendary && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '12px',
                  background: 'radial-gradient(circle at center, rgba(245,158,11,0.18) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
            )}

            <span style={{ fontSize: '28px', lineHeight: 1 }} aria-hidden>
              {badge.emoji}
            </span>

            {!isEarned && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  fontSize: '10px',
                  opacity: 0.5,
                }}
                aria-hidden
              >
                🔒
              </span>
            )}

            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textAlign: 'center',
                color: isEarned ? '#fff' : 'rgba(255,255,255,0.4)',
                lineHeight: 1.2,
              }}
            >
              {badge.name}
            </span>

            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: '99px',
                color: isEarned ? rarity.color.replace('text-', '') : 'rgba(255,255,255,0.2)',
                background: isEarned
                  ? rarity.bg.replace('bg-', '')
                  : 'transparent',
              }}
              className={isEarned ? `${rarity.color} ${rarity.bg}` : ''}
            >
              {rarity.label}
            </span>
          </div>
        );
      })}

      <style>{`
        @keyframes legendaryGlow {
          from { box-shadow: 0 0 8px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.1); }
          to   { box-shadow: 0 0 16px rgba(245,158,11,0.6), 0 0 40px rgba(245,158,11,0.25); }
        }
      `}</style>
    </div>
  );
}
