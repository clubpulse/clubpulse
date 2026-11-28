import type { ReactNode } from 'react';
import Link from 'next/link';
import { ensureProfile, requireUser } from '@/lib/auth/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DobPrompt } from '@/components/layout/DobPrompt';
import { GuardianConsentPrompt } from '@/components/layout/GuardianConsentPrompt';
import { guardianPromptFor } from '@/lib/community/guardian-consent';
import { cameraDrillsEnabled } from '@/lib/camera-drills/flag';
import { loadDrillSummary } from '@/lib/actions/camera-drills';
import { BaselinePrompt } from '@/components/drills/BaselinePrompt';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  // Same call requireUser made, so this is the cached answer, not another lookup
  const { needsDob } = await ensureProfile(user);
  const metaEmail = (user.user_metadata as { guardian_email?: unknown } | null)?.guardian_email;
  const fallback = typeof metaEmail === 'string' ? metaEmail : '';
  let guardian: { show: boolean; email: string } = { show: false, email: '' };
  if (!needsDob) {
    try {
      guardian = await guardianPromptFor(user.id, fallback);
    } catch (e) {
      console.error('[auth] guardian prompt:', e instanceof Error ? e.message : e);
    }
  }
  let drills = null;
  if (cameraDrillsEnabled() && !needsDob) {
    try {
      drills = await loadDrillSummary(user.id);
    } catch (e) {
      console.error('[drills] summary:', e instanceof Error ? e.message : e);
    }
  }
  const offerBaseline = !!drills && !drills.skipped && Object.keys(drills.baseline).length === 0;
  const suggestToday = !!drills && !offerBaseline && Object.keys(drills.baseline).length > 0 && !!drills.today;
  return (
    <DashboardShell user={user}>
      {needsDob ? <DobPrompt /> : null}
      {guardian.show ? <GuardianConsentPrompt initialEmail={guardian.email} /> : null}
      {offerBaseline && drills ? <BaselinePrompt junior={drills.junior} /> : null}
      {suggestToday && drills?.today ? (
        <p className="mb-4 text-sm text-neutral-400">
          Today&apos;s movement check is optional.{' '}
          <Link href="/drills?daily=1" className="text-sky-400">{drills.today.title}</Link>
        </p>
      ) : null}
      {children}
    </DashboardShell>
  );
}
