import type { Metadata } from 'next';
import { renderPillarPage } from '@/lib/roles/pillar-page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Technique' };

export default function TechniquePage() {
  return renderPillarPage('technique');
}
