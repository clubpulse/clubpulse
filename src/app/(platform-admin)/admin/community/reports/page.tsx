import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { getReviewQueue } from '@/lib/community/review';
import { ModerationRow } from '@/components/community/ModerationRow';
import { PageHeader, EmptyState } from '@/components/platform-admin/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Community reports | Admin | ShiftUp' };

export default async function CommunityReportsPage() {
  await requireAdmin();
  const items = await getReviewQueue();
  return (
    <div>
      <PageHeader title="Community reports" description="Reported content and anything the safety check held, oldest first." />
      {items.length === 0 ? <EmptyState icon="✅" title="Nothing to review" /> : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={`${i.kind}-${i.targetId}-${i.reportId ?? 'held'}`} className="rounded-xl border border-neutral-800 p-4">
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
