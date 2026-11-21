'use client';

// The Honours Board as a tilted wall of badges drifting past, a vertical take on the feature strip.
// The badges come from the same list the app uses, so the wall is always the real set.

import Link from 'next/link';
import { Glyph } from '@/components/icons/Glyph';
import { Marquee, ShimmerButton } from '@/components/magic';
import { BADGE_DEFS, type BadgeGroup } from '@/lib/mobile/badges-logic';

const TINT: Record<BadgeGroup, string> = { technique: '#FBBF24', wellness: '#F472B6', academy: '#2DD4BF', club: '#60A5FA', scores: '#EFC84A' };
const COLUMNS = 6;

// Spread the badges over the columns in a mixed order so neighbours differ
const columns: (typeof BADGE_DEFS)[number][][] = Array.from({ length: COLUMNS }, () => []);
BADGE_DEFS.forEach((b, i) => columns[(i * 7) % COLUMNS].push(b));

function Card({ b }: { b: (typeof BADGE_DEFS)[number] }) {
  const c = TINT[b.group];
  return (
    <div style={{ width: 230, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, border: `1px solid ${c}44`, background: `linear-gradient(135deg, ${c}1F, rgba(7,16,43,0.92))` }}>
      <span style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${c}`, background: `${c}22`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Glyph e={b.icon} size={22} motion="none" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#E8EDF5', lineHeight: 1.2 }}>{b.title}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(232,237,245,0.5)', lineHeight: 1.35, marginTop: 2 }}>{b.how}</span>
      </span>
    </div>
  );
}

export function BadgeWall() {
  return (
    <section aria-labelledby="wall-h" style={{ position: 'relative', overflow: 'hidden', height: 640, background: '#05080f', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {/* The wall: tilted, drifting, and a little faded */}
      <div aria-hidden style={{ position: 'absolute', inset: '-30% -10%', display: 'flex', justifyContent: 'center', gap: 18, transform: 'rotateX(24deg) rotateZ(-22deg) scale(1.1)', transformOrigin: 'center', opacity: 0.9 }}>
        {columns.map((col, i) => (
          <div key={i} style={{ width: 230, height: '100%' }}>
            <Marquee vertical duration={70 + i * 9} gap={16} reverse={i % 2 === 1}>
              {col.map((b) => <Card key={b.key} b={b} />)}
            </Marquee>
          </div>
        ))}
      </div>

      {/* A dark centre so the words can be read over the wall */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(5,8,15,0.96) 30%, rgba(5,8,15,0.55) 70%, rgba(5,8,15,0.2))' }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EFC84A', marginBottom: 12 }}>The Honours Board</p>
        <h2 id="wall-h" style={{ fontFamily: 'var(--font-syne), Bricolage Grotesque, sans-serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.05, color: '#E8EDF5', maxWidth: 760 }}>
          {BADGE_DEFS.length} badges. Earn them. Share them.
        </h2>
        <p style={{ marginTop: 16, maxWidth: 560, fontSize: 16, lineHeight: 1.6, color: 'rgba(232,237,245,0.65)' }}>
          From your first analysed shot to a hundred days at the crease. Share a badge with your friends. It never shows your name or your club.
        </p>
        <div style={{ marginTop: 28, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <ShimmerButton href="/contact">Start earning →</ShimmerButton>
          <Link href="/features" style={{ fontSize: 14, fontWeight: 700, color: '#EFC84A', textDecoration: 'none' }}>See all features →</Link>
        </div>
      </div>
    </section>
  );
}
