import { Card } from '@/components/ui/Card';
import { formatScores, formatDate } from '@/lib/utils/format';
import type { WalletTransaction } from '@/lib/types/scores';

export function RecentActivity({ items }: { items: WalletTransaction[] }) {
  return (
    <Card title="Recent activity">
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing yet. Log a performance or sync your steps to start earning.</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{item.title}</p>
                <p className="text-xs text-neutral-500">{formatDate(item.occurred_at)}</p>
              </div>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.amount >= 0 ? '+' : ''}{formatScores(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
