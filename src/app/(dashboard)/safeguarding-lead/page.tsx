import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ageVerificationEnabled } from '@/lib/age-verification/flag';
import { LEAD_NOT_ACTIVE, leadStatus, listLeadQueue } from '@/lib/age-verification/lead';
import { LeadFlagList } from '@/components/club/LeadFlagList';
import { h1, muted } from '@/components/play/ui';

export const metadata: Metadata = { title: 'Safeguarding lead' };
export const dynamic = 'force-dynamic';

/** Squad flags for clubs with no welfare officer. Only a named lead sees it, and every view is written to the audit log. */
export default async function SafeguardingLeadPage() {
  if (!ageVerificationEnabled()) notFound();
  const user = await requireUser();
  const status = await leadStatus(createAdminClient(), user.id);
  if (status.reasons.includes('not a named lead')) notFound();
  const queue = status.active ? await listLeadQueue(user.id) : { items: [], skippedForConflict: 0, error: `${LEAD_NOT_ACTIVE} (${status.reasons.join(', ')}).` };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={h1}>Safeguarding lead</h1>
      <p style={muted}>
        These flags are at clubs with no welfare officer. Each player has been told to ask their club to confirm their date of birth.
        Closing a flag needs a written note. Opening this page and every decision are recorded and cannot be edited.
      </p>
      {queue.skippedForConflict > 0 && (
        <p style={muted}>{queue.skippedForConflict} flag{queue.skippedForConflict === 1 ? ' is' : 's are'} not shown because {queue.skippedForConflict === 1 ? 'it involves' : 'they involve'} you or your own club. Another lead will need to decide {queue.skippedForConflict === 1 ? 'it' : 'them'}.</p>
      )}
      <LeadFlagList items={queue.items} error={queue.error} />
    </div>
  );
}
