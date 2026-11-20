// Server-only. Renders one pillar's page for the signed-in person.

import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getAudience } from '@/lib/nav/audience';
import { pillarByKey, pillarSections, type PillarKey } from '@/lib/nav/pillars';
import { PillarPageView } from '@/components/pillars/PillarPageView';

export async function renderPillarPage(key: PillarKey) {
  const user = await requireUser();
  const pillar = pillarByKey(key);
  if (!pillar) notFound();
  const audience = await getAudience(user.id);
  return <PillarPageView pillar={pillar} sections={pillarSections(key, audience)} />;
}
