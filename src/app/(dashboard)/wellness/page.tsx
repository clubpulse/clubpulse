import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getAudience } from '@/lib/nav/audience';
import { pillarByKey, pillarSections } from '@/lib/nav/pillars';
import { PillarPageView } from '@/components/pillars/PillarPageView';
import { WellnessToday } from '@/components/wellness/WellnessToday';
import { getWellnessToday } from '@/lib/actions/wellness';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Wellness' };

export default async function WellnessPage() {
  const user = await requireUser();
  const pillar = pillarByKey('wellness');
  if (!pillar) notFound();
  const audience = await getAudience(user.id);
  const sections = pillarSections('wellness', audience);

  // Today's tools lead the page, for players. Everyone else keeps the plain pillar page.
  let lead = null;
  if (audience.roles.includes('player')) {
    const today = await getWellnessToday();
    lead = today.success
      ? <WellnessToday initial={today.data} />
      : <p role="alert" style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}>{today.error}</p>;
  }
  return <PillarPageView pillar={pillar} sections={sections} lead={lead} />;
}
