'use client';

// A card whose glow follows the pointer. A link when given an address, a plain panel otherwise.

import Link from 'next/link';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

type Props = { href?: string; tint?: string; index?: number; className?: string; style?: CSSProperties; children: ReactNode };

function track(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`);
}

export function MagicCard({ href, tint = '#60A5FA', index = 0, className = '', style, children }: Props) {
  const all = { ...style, '--mg-tint': tint, '--mg-i': index } as CSSProperties;
  const classes = `mg-card mg-in ${className}`;
  return href
    ? <Link href={href} className={classes} style={all} onPointerMove={track}>{children}</Link>
    : <div className={classes} style={all} onPointerMove={track}>{children}</div>;
}
