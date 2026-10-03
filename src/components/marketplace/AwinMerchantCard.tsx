import { Badge } from '@/components/ui/Badge';
import { buildAwinLink, type AwinMerchant } from '@/lib/awin';

// Affiliate link tracked to the user via clickref, so cashback is attributed to them
export function AwinMerchantCard({ merchant, userId }: { merchant: AwinMerchant; userId: string }) {
  const href = buildAwinLink(merchant.id, merchant.deepLink, userId);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white">{merchant.name}</h3>
        <Badge tone="gold">{merchant.commission}% back</Badge>
      </div>
      <p className="text-sm text-neutral-400">{merchant.description}</p>
      <span className="mt-1 text-xs font-medium text-brand-gold">Shop and earn Scores →</span>
    </a>
  );
}
