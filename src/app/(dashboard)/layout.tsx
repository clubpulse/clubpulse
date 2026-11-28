import type { ReactNode } from 'react';
import { ensureProfile, requireUser } from '@/lib/auth/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DobPrompt } from '@/components/layout/DobPrompt';
import { GuardianConsentPrompt } from '@/components/layout/GuardianConsentPrompt';
import { guardianPromptFor } from '@/lib/community/guardian-consent';

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
  return (
    <DashboardShell user={user}>
      {needsDob ? <DobPrompt /> : null}
      {guardian.show ? <GuardianConsentPrompt initialEmail={guardian.email} /> : null}
      {children}
    </DashboardShell>
  );
}
