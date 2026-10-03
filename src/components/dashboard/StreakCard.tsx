'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { STREAK_SHIELD_COST } from '@/lib/types/sport';
import type { StreakInfo } from '@/lib/activity/service';

export function StreakCard({ info }: { info: StreakInfo }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function useShield() {
    setLoading(true);
    try {
      const res = await fetch('/api/steps/streak-shield', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Could not use the streak shield');
        return;
      }
      toast.success('Streak protected for today');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Streak">
      <div className="flex items-center gap-4">
        <span className="text-4xl" aria-hidden>{info.streakDay > 0 ? '🔥' : '💤'}</span>
        <div>
          <p className="text-3xl font-bold tabular-nums text-white">
            {info.streakDay} <span className="text-base font-medium text-neutral-400">{info.streakDay === 1 ? 'day' : 'days'}</span>
          </p>
          <p className="text-xs text-neutral-500">
            {info.protectedToday
              ? 'Protected by a streak shield today'
              : info.loggedToday
                ? "Today's steps are logged"
                : info.atRisk
                  ? 'Log steps today or your streak ends'
                  : 'Log steps in the app to start a streak'}
          </p>
        </div>
      </div>

      {info.atRisk && (
        <Button onClick={useShield} loading={loading} variant="secondary" className="mt-4 w-full">
          🛡️ Use streak shield ({STREAK_SHIELD_COST} Scores)
        </Button>
      )}
    </Card>
  );
}
