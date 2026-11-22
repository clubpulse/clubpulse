'use client';

import { reportProfileAction } from '@/lib/actions/community-social';
import { ReportButton } from './ui';

/** Client wrapper so a Server Component page can offer "Report" without passing a closure across the boundary. */
export function ReportProfileButton({ userId }: { userId: string }) {
  return <ReportButton run={(reason) => reportProfileAction(userId, reason)} />;
}
