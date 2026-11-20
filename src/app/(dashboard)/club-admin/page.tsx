import type { Metadata } from 'next';
import { renderRolePage } from '@/lib/roles/page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin' };

export default function ClubAdminPage() {
  return renderRolePage('admin');
}
