'use client';

import Link from 'next/link';
import { skipBaseline } from '@/lib/actions/camera-drills';
import { WARMUP_NOTE } from '@/lib/camera-drills/ring';

/** A skippable offer after sign-in. It does not block the rest of the app. */
export function BaselinePrompt({ junior }: { junior: boolean }) {
  return (
    <section className="mb-4 rounded-2xl border border-white/10 bg-neutral-950 p-4 text-neutral-100">
      <h2 className="text-lg font-semibold">A short movement check</h2>
      <p className="mt-1 text-sm text-amber-200">{WARMUP_NOTE}</p>
      <p className="mt-2 text-sm text-neutral-400">
        Four short camera checks can set a starting point. You can skip this and do it later from your profile.
        {junior ? ' It is optional and does not unlock or lock anything else.' : ''}
      </p>
      <div className="mt-3 flex gap-3 text-sm">
        <Link href="/drills" className="rounded-full bg-sky-500 px-3 py-1 font-medium text-neutral-950">Start</Link>
        <button type="button" className="rounded-full border border-white/15 px-3 py-1" onClick={() => void skipBaseline()}>Skip for now</button>
      </div>
    </section>
  );
}
