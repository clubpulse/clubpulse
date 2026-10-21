'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
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

  const isActive = info.streakDay > 0;

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 700,
        fontSize: '13px', color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.8px',
        margin: '0 0 14px',
      }}>Streak</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '40px', lineHeight: 1 }} aria-hidden>
          {isActive ? '🔥' : '💤'}
        </span>
        <div>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {info.streakDay}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
              {info.streakDay === 1 ? 'day' : 'days'}
            </span>
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
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
        <div style={{ marginTop: '14px' }}>
          <Button onClick={useShield} loading={loading} variant="secondary" className="w-full">
            🛡️ Use streak shield ({STREAK_SHIELD_COST} Scores)
          </Button>
        </div>
      )}
    </div>
  );
}
