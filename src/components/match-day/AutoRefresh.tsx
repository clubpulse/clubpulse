'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-reads the server page every few seconds while a match is live. */
export function AutoRefresh({ everyMs = 10000, active }: { everyMs?: number; active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [active, everyMs, router]);
  return null;
}
