'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { markScratchPrizeFulfilled, retryScratchGiftCard } from '@/lib/actions/scratch-cards';
import type { ScratchCard } from '@/lib/actions/scratch-cards';
import { formatDate } from '@/lib/utils/format';
import { card, cardTitle, muted, pill, row } from '@/components/play/ui';

type Pending = ScratchCard & { player_name: string; fulfilment_notes?: string | null };

// Scratch card prizes that still need action: club rewards to hand over, and gift cards that failed to issue.
export function PendingPrizes({ clubId, cards }: { clubId: string; cards: Pending[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (cards.length === 0) return null;

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => start(async () => {
    const res = await fn();
    if (!res.success) toast.error(res.error ?? 'Something went wrong'); else toast.success(ok);
    router.refresh();
  });

  return (
    <div style={card}>
      <p style={cardTitle}>Prizes waiting for you</p>
      <p style={{ ...muted, marginBottom: '8px' }}>Club rewards to hand over, and any gift cards that could not be issued automatically.</p>
      {cards.map((c) => {
        const prize = (c.prize_snapshot ?? {}) as { type?: string; label?: string };
        const isGift = prize.type === 'gift_card';
        return (
          <div key={c.id} style={{ ...row, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>{c.player_name} · {prize.label ?? 'Prize'}</p>
              <p style={{ ...muted, fontSize: '11px' }}>
                Won {c.scratched_at ? formatDate(c.scratched_at) : ''}{c.fulfilment_notes ? ` · ${c.fulfilment_notes}` : ''}
              </p>
            </div>
            {isGift && (
              <button type="button" disabled={pending} style={pill('blue')} onClick={() => run(() => retryScratchGiftCard(clubId, c.id), 'Gift card issued')}>Retry gift card</button>
            )}
            <button type="button" disabled={pending} style={pill('gold')} onClick={() => run(() => markScratchPrizeFulfilled(clubId, c.id), 'Marked as handed over')}>Mark handed over</button>
          </div>
        );
      })}
    </div>
  );
}
