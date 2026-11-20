import type { Metadata } from 'next';
import { renderPillarPage } from '@/lib/roles/pillar-page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Academy' };

export default function AcademyPage() {
  return renderPillarPage('academy');
}
