import Link from 'next/link';
import type { CSSProperties } from 'react';
import { card } from '@/components/play/ui';

// Clubs do not pay by card here. A club tells us what it needs, we agree a plan and a fixed
// period with it, and we set the platform up to match. This card shows what the club has and
// points to the form.

const label: CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', margin: '0 0 6px' };
const button: CSSProperties = {
  display: 'inline-block', padding: '10px 18px', borderRadius: '9px', background: '#1D4ED8', color: '#fff',
  fontWeight: 600, fontSize: '14px', textDecoration: 'none',
};

export function ClubPlanCard({ title, current, children }: {
  title: string;
  /** What the club has now, e.g. "Club plan, to 31 March 2027". Left out when there is nothing yet. */
  current?: string | null;
  children: string;
}) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <p style={label}>{title}</p>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>
          {current ?? 'Not set up yet'}
        </p>
      </div>
      <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.6)', lineHeight: 1.65, margin: 0 }}>{children}</p>
      <div>
        <Link href="/contact" style={button}>Tell us what your club needs →</Link>
      </div>
    </div>
  );
}
