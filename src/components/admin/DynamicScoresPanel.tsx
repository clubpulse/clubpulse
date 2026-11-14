'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { stopMultiplier } from '@/lib/actions/admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils/format';
import type { DynamicMultiplier } from '@/lib/ai/dynamic-scores';

function statusOf(m: DynamicMultiplier, now: number): 'active' | 'scheduled' | 'ended' {
  if (Date.parse(m.active_from) > now) return 'scheduled';
  if (m.active_until && Date.parse(m.active_until) <= now) return 'ended';
  return 'active';
}

export function DynamicScoresPanel({ multipliers }: { multipliers: DynamicMultiplier[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  async function end(id: string) {
    setBusyId(id);
    const result = await stopMultiplier(id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Multiplier ended');
    router.refresh();
  }

  if (multipliers.length === 0) {
    return <p className="text-sm text-neutral-500">No multipliers yet. Create one to boost Scores for a period.</p>;
  }

  return (
    <ul className="space-y-3">
      {multipliers.map((m) => {
        const status = statusOf(m, now);
        return (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div>
              <p className="font-medium text-white">
                {m.name} <span className="text-brand-gold">×{m.multiplier}</span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {m.condition_type.replace('_', ' ')} · {formatDate(m.active_from)} → {m.active_until ? formatDate(m.active_until) : 'open-ended'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={status === 'active' ? 'green' : status === 'scheduled' ? 'gold' : 'neutral'}>{status}</Badge>
              {status !== 'ended' && (
                <Button variant="danger" size="sm" onClick={() => end(m.id)} loading={busyId === m.id}>End now</Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
