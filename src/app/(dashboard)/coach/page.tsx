import type { Metadata } from 'next';
import { renderRolePage } from '@/lib/roles/page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Coach' };

export default function CoachPage() {
  return renderRolePage('coach');
}
