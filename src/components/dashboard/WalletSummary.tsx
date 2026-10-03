import { Card } from '@/components/ui/Card';
import { scoresToPence, formatScores, formatGBP } from '@/lib/utils/format';

export function WalletSummary({ flexi, reward }: { flexi: number; reward: number }) {
  const total = flexi + reward;

  return (
    <Card className="bg-gradient-to-br from-brand-primary/20 to-neutral-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">Total Scores</p>
      <p className="mt-2 text-5xl font-bold tabular-nums text-white">{formatScores(total)}</p>
      <p className="mt-1 text-sm text-neutral-400">≈ {formatGBP(scoresToPence(total))} · 50 Scores = £1</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <p className="text-xs uppercase text-neutral-500">Flexi</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">{formatScores(flexi)}</p>
          <p className="text-xs text-neutral-500">{formatGBP(scoresToPence(flexi))}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <p className="text-xs uppercase text-neutral-500">Reward</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">{formatScores(reward)}</p>
          <p className="text-xs text-neutral-500">{formatGBP(scoresToPence(reward))}</p>
        </div>
      </div>
    </Card>
  );
}
