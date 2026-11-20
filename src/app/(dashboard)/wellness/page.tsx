import type { Metadata } from 'next';
import { renderPillarPage } from '@/lib/roles/pillar-page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Wellness' };

export default function WellnessPage() {
  return renderPillarPage('wellness');
}
