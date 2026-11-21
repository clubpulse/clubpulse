import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { getShareSettings } from '@/lib/actions/wellness';
import { ShareToggle } from '@/components/wellness/ShareToggle';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sharing | Wellness' };

export default async function WellnessSettingsPage() {
  await requireUser();
  const r = await getShareSettings();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Sharing</h1>
      <p><strong>Private unless you choose to share averages with your club’s coaches. Notes stay private.</strong></p>
      <p>If you turn sharing on, coaches at that club can see your average sleep, mood, soreness and stress over the last week or so, and only once you have checked in at least twice. They never see your notes, your recovery log or any single day. You can turn it off at any time and it stops straight away.</p>
      {r.success ? (r.data.length ? r.data.map((c) => <ShareToggle key={c.clubId} club={c} />) : <p>You are not in a club yet.</p>) : <p role="alert">{r.error}</p>}
    </div>
  );
}
