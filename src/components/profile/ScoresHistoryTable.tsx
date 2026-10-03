import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatScores, formatDate } from '@/lib/utils/format';
import type { WalletTransaction, WalletTransactionKind } from '@/lib/types/scores';

const KIND_LABEL: Record<WalletTransactionKind, string> = {
  performance:  'Performance',
  steps:        'Steps',
  shopping:     'Shopping',
  volunteering: 'Volunteering',
  redemption:   'Redeemed',
};

export function ScoresHistoryTable({ items }: { items: WalletTransaction[] }) {
  return (
    <Card title="Scores history">
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">No Scores activity yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-xs uppercase text-neutral-500">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">What</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 text-right font-medium">Scores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-neutral-400">{formatDate(item.occurred_at)}</td>
                  <td className="py-2.5 pr-4 text-white">{item.title}</td>
                  <td className="py-2.5 pr-4"><Badge tone={item.amount < 0 ? 'red' : 'neutral'}>{KIND_LABEL[item.kind]}</Badge></td>
                  <td className={`py-2.5 text-right font-semibold tabular-nums ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.amount >= 0 ? '+' : ''}{formatScores(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
