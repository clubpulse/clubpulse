'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils/format';
import type { VolunteerSessionWithName } from '@/lib/types/volunteer';

export function VolunteerApprovalCard({ session }: { session: VolunteerSessionWithName }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/volunteers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Could not approve');
        return;
      }
      toast.success(body.credsAwarded > 0 ? `Approved: ${body.credsAwarded} Creds awarded` : 'Approved (no Creds: location not confirmed)');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <div>
        <p className="font-medium text-white">
          {session.volunteer_name ?? 'Volunteer'} · <span className="capitalize">{session.role.replace(/_/g, ' ')}</span>
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">{formatDate(session.session_date)}</p>
        <div className="mt-2 flex gap-2">
          {session.gps_confirmed ? <Badge tone="green">At the ground</Badge> : <Badge tone="red">Location not confirmed</Badge>}
        </div>
      </div>
      <Button onClick={approve} loading={loading}>Approve</Button>
    </div>
  );
}
