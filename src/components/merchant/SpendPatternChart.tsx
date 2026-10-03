import { formatCreds } from '@/lib/utils/format';
import type { SpendPattern } from '@/lib/types/merchant';

// Horizontal bars, one per category, sized by redemptions
export function SpendPatternChart({ patterns }: { patterns: SpendPattern[] }) {
  if (patterns.length === 0) return <p className="text-sm text-neutral-500">Not enough data to show categories yet.</p>;
  const max = Math.max(...patterns.map((p) => p.redemptions));

  return (
    <ul className="space-y-3" aria-label="Redemptions by category">
      {patterns.map((p) => (
        <li key={p.category}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="capitalize text-white">{p.category}</span>
            <span className="text-neutral-400">
              {p.redemptions} redemptions · {formatCreds(p.creds_spent)} Creds
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-gold"
              style={{ width: `${Math.max(4, (p.redemptions / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
