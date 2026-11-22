import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getAudience } from '@/lib/nav/audience';
import { pillarByKey, pillarSections } from '@/lib/nav/pillars';
import { PillarPageView } from '@/components/pillars/PillarPageView';
import { Catalogue } from '@/components/academy/Catalogue';
import { getAcademy } from '@/lib/academy/service';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Academy' };

export default async function AcademyPage() {
  const user = await requireUser();
  const pillar = pillarByKey('academy');
  if (!pillar) notFound();
  const audience = await getAudience(user.id);
  const academy = await getAcademy(user.id);
  return <PillarPageView pillar={pillar} sections={pillarSections('academy', audience)} lead={<Catalogue academy={academy} />} />;
}
