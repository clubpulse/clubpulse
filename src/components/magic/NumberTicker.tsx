'use client';

// Counts up to a number when it scrolls into view. The finished number is in the page from the
// start, so it reads correctly with scripts off, for screen readers, and with motion reduced.

import { useEffect, useRef } from 'react';

const format = (n: number) => Math.round(n).toLocaleString('en-GB');

export function NumberTicker({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const run = () => {
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        // Fast at first, easing into the final figure
        el.textContent = format(value * (1 - Math.pow(1 - t, 4)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        seen.disconnect();
        run();
      }
    }, { threshold: 0.4 });
    seen.observe(el);
    return () => {
      seen.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = format(value);
    };
  }, [value, duration]);

  return <span ref={ref} aria-label={format(value)}>{format(value)}</span>;
}
