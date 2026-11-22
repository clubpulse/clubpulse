// The picture that shows when a badge link is shared in a message or on social media.
// Drawn with shapes and text only, so it does not depend on any outside font or emoji service.

import { ImageResponse } from 'next/og';
import { badgeDef } from '@/lib/mobile/badges-logic';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A SHIFTUP badge';

const GOLD = '#EFC84A';

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const def = badgeDef((await params).key);
  const title = def?.title ?? 'SHIFTUP badge';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: '#04091A', color: '#fff', padding: 80 }}>
        <div style={{ width: 340, height: 340, borderRadius: 170, border: `14px solid ${GOLD}`, background: 'rgba(239,200,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="190" height="190" viewBox="0 0 24 24">
            <path fill={GOLD} d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 70, flex: 1 }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: GOLD, fontWeight: 700 }}>SHIFTUP BADGE</div>
          <div style={{ fontSize: title.length > 18 ? 76 : 96, fontWeight: 800, lineHeight: 1.05, marginTop: 20 }}>{title}</div>
          <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.75)', marginTop: 24 }}>{def?.how ?? ''}</div>
          <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)', marginTop: 44 }}>clubpulse.co</div>
        </div>
      </div>
    ),
    size,
  );
}
