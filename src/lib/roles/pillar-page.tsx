// Server-only. Renders one pillar's page for the signed-in person.

import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getAudience } from '@/lib/nav/audience';
import { pillarByKey, pillarSections, whenOpen, type PillarKey } from '@/lib/nav/pillars';
import { communityOpen } from '@/lib/community/service';
import { PillarPageView } from '@/components/pillars/PillarPageView';

export async function renderPillarPage(key: PillarKey) {
  const user = await requireUser();
  const pillar = pillarByKey(key);
  if (!pillar) notFound();
  const audience = await getAudience(user.id);
  const open = communityOpen();
  return <PillarPageView pillar={whenOpen(pillar, open)} sections={pillarSections(key, audience, { community: open })} />;
}
