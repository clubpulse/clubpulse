import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { getMyRoutine } from '@/lib/actions/wellness';
import { RoutineBuilder } from '@/components/wellness/RoutineBuilder';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My routine | Wellness' };

export default async function RoutinePage() {
  await requireUser();
  const r = await getMyRoutine();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>My routine</h1>
      <p>A routine tells your body it is time. Build yours from the match-day steps and use it the same way every time. This is general preparation, not medical advice.</p>
      {r.success ? <RoutineBuilder initialIds={r.data.itemIds} initialTicks={r.data.ticks} /> : <p role="alert">{r.error}</p>}
    </div>
  );
}
