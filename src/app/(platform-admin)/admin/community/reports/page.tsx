import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { getReviewQueue } from '@/lib/community/review';
import { createAdminClient } from '@/lib/supabase/admin';
import { alertHealth, deliverDue } from '@/lib/safeguarding/alerts';
import { ModerationRow } from '@/components/community/ModerationRow';
import { PageHeader, EmptyState } from '@/components/platform-admin/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Community reports | Admin | ShiftUp' };

export default async function CommunityReportsPage() {
  await requireAdmin();
  const items = await getReviewQueue();
  // Opening the queue also retries any alert that has not gone out yet
  const admin = createAdminClient();
  await deliverDue(admin);
  const health = await alertHealth(admin);
  return (
    <div>
      <PageHeader title="Community reports" description="Reported content and anything the safety check held, oldest first." />
      {health.contacts === 0 && <p className="mb-3 rounded-xl border border-red-700 p-3 text-sm text-red-300">No safeguarding lead or deputy is set up to be alerted. New reports and held items will not be emailed to anyone until one is added.</p>}
      {health.failed > 0 && <p className="mb-3 rounded-xl border border-amber-700 p-3 text-sm text-amber-300">{health.failed} safeguarding alert{health.failed === 1 ? '' : 's'} could not be sent and {health.failed === 1 ? 'is' : 'are'} being retried.</p>}
      {items.length === 0 ? <EmptyState icon="✅" title="Nothing to review" /> : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={`${i.kind}-${i.targetId}-${i.reportId ?? 'held'}`} id={`item-${i.kind}-${i.targetId}`} className="rounded-xl border border-neutral-800 p-4">
              <p className="text-xs uppercase text-neutral-500">{i.reportId ? 'Reported' : 'Held'} · {i.kind} · {i.authorName} · {new Date(i.createdAt).toLocaleString('en-GB')}</p>
              <p className="my-2 whitespace-pre-wrap">{i.text}</p>
              {i.reason && <p className="mb-3 text-sm text-neutral-400">Reason: {i.reason}</p>}
              <ModerationRow item={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
