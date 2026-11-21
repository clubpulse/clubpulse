'use client';

// Effects in the style of Magic UI (magicui.design): Marquee, ShimmerButton, AnimatedGradientText,
// BorderBeam, Meteors, DotPattern, NumberTicker and a bento grid. The Magic UI registry could not be
// reached from where this was built, so these are written out here with the same names and look.
// They need no extra packages; the animations live in globals.css and stop for reduced motion.

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export function Marquee({ children, duration = 40, gap = 16, reverse = false }: { children: ReactNode; duration?: number; gap?: number; reverse?: boolean }) {
  const style = { '--mu-duration': `${duration}s`, '--mu-gap': `${gap}px` } as CSSProperties;
  const track = { animationDirection: reverse ? 'reverse' : 'normal' } as CSSProperties;
  return (
    <div className="mu-marquee" style={{ ...style, maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)' }}>
      {[0, 1].map((n) => (
        <div key={n} className="mu-marquee-track" style={track} aria-hidden={n === 1}>{children}</div>
      ))}
    </div>
  );
}

export function ShimmerButton({ href, children, style }: { href: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <Link href={href} className="mu-shimmer-btn" style={style}>
      <span>{children}</span>
    </Link>
  );
}

export function AnimatedGradientText({ children }: { children: ReactNode }) {
  return <span className="mu-gradient-text">{children}</span>;
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="mu-pill">{children}</span>;
}

/** A light that travels round the edge of its parent, which needs position: relative */
export function BorderBeam({ size = 90, duration = 8, from = '#EFC84A', to = '#60A5FA', delay = 0 }: { size?: number; duration?: number; from?: string; to?: string; delay?: number }) {
  const style = { '--mu-beam-size': `${size}px`, '--mu-beam-duration': `${duration}s`, '--mu-from': from, '--mu-to': to, animationDelay: `-${delay}s` } as CSSProperties;
  return <div className="mu-beam" style={style} aria-hidden />;
}

export function Meteors({ count = 14 }: { count?: number }) {
  // Fixed positions from a small formula, so server and browser draw the same thing
  const list = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 137) % 100}%`,
    delay: `${((i * 53) % 50) / 10}s`,
    duration: `${4 + ((i * 29) % 40) / 10}s`,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
      {list.map((m, i) => (
        <span key={i} className="mu-meteor" style={{ left: m.left, animationDelay: m.delay, animationDuration: m.duration }} />
      ))}
    </div>
  );
}

/** A faded dot grid for backgrounds */
export function DotPattern({ spacing = 26, dot = 1.2, opacity = 0.35 }: { spacing?: number; dot?: number; opacity?: number }) {
  const id = useId();
  return (
    <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse at 50% 30%, #000 20%, transparent 72%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, #000 20%, transparent 72%)' }}>
      <defs>
        <pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={dot} cy={dot} r={dot} fill={`rgba(148,176,255,${opacity})`} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Counts up to a number once it scrolls into view */
export function NumberTicker({ value, duration = 1600, prefix = '', suffix = '' }: { value: number; duration?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = still ? 1 : Math.min((now - t0) / duration, 1);
        setN(Math.round((1 - Math.pow(1 - p, 3)) * value));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref}>{prefix}{n.toLocaleString('en-GB')}{suffix}</span>;
}

export function BentoGrid({ children }: { children: ReactNode }) {
  return <div className="mu-bento">{children}</div>;
}

export function BentoCard({ colour, col, row = 1, children, beam = false }: { colour: string; col: number; row?: number; children: ReactNode; beam?: boolean }) {
  return (
    <article className="mu-bento-card" style={{ padding: 26, gridColumn: `span ${col}`, gridRow: `span ${row}`, borderColor: `${colour}44`, background: `radial-gradient(120% 90% at 100% 0%, ${colour}26, transparent 60%), rgba(7,16,43,0.85)` }}>
      {children}
      {beam && <BorderBeam from={colour} to="#60A5FA" />}
    </article>
  );
}
