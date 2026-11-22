import type { ReactNode } from 'react';
import { ensureProfile, requireUser } from '@/lib/auth/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DobPrompt } from '@/components/layout/DobPrompt';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  // Same call requireUser made, so this is the cached answer, not another lookup
  const { needsDob } = await ensureProfile(user);
  return <DashboardShell user={user}>{needsDob && <DobPrompt />}{children}</DashboardShell>;
}
