import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { getRecoveryLog } from '@/lib/actions/wellness';
import { RecoveryLog } from '@/components/wellness/RecoveryLog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Recovery log | Wellness' };

export default async function RecoveryPage() {
  await requireUser();
  const r = await getRecoveryLog();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Recovery log</h1>
      <p>A private note of how your body feels and what you did about it. Only you can see it. It is not a diagnosis and it does not suggest treatment. For pain or an injury that worries you, speak to a physio, your GP or a trusted adult. See <Link href="/wellness/support">where to get support</Link>.</p>
      {r.success ? <RecoveryLog rows={r.data} /> : <p role="alert">{r.error}</p>}
    </div>
  );
}
