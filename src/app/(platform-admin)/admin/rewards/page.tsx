import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { displayName, formatDateTime, pageFromParam, pageRange, profilesById } from '@/lib/platform-admin';
import type { ScoresWallet } from '@/lib/types/scores';
import { totalBalance } from '@/lib/types/scores';
import { Cell, EmptyState, ErrorNote, PageHeader, Pagination, StatCard, Table } from '@/components/platform-admin/ui';

export const metadata: Metadata = { title: 'Rewards | Admin | ClubPulse' };

type Totals = { points_issued: number; points_in_circulation: number };

export default async function AdminRewardsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = pageFromParam((await searchParams).page);
  const service = createAdminClient();

  // creds_wallet is the source of truth for balances; there's no ledger table, so
  // "last activity" is the wallet's updated_at (bumped on every earn or spend).
  const [{ data: totals }, { data, count, error }] = await Promise.all([
    service.rpc('admin_stats').single<Totals>(),
    service
      .from('creds_wallet')
      .select('id, user_id, flexi_balance, reward_balance, lifetime_earned, updated_at', { count: 'exact' })
      .order('lifetime_earned', { ascending: false })
      .range(...pageRange(page))
      .returns<ScoresWallet[]>(),
  ]);
  const wallets = data ?? [];
  const profiles = await profilesById(service, wallets.map((wallet) => wallet.user_id));

  return (
    <>
      <PageHeader title="Rewards" description="Points balances across all wallets, highest earners first." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Points in circulation" value={Number(totals?.points_in_circulation ?? 0)} hint="Unspent flexi + reward balances" />
        <StatCard label="Points issued all-time" value={Number(totals?.points_issued ?? 0)} accent="crimson" />
      </div>
      {error && <ErrorNote message={`Couldn’t load wallets: ${error.message}`} />}

      {!error && wallets.length === 0 ? (
        <EmptyState icon="🪙" title="No wallets yet" />
      ) : (
        <Table headers={['User', 'Balance', 'Earned all-time', 'Last activity']}>
          {wallets.map((wallet) => {
            const profile = profiles.get(wallet.user_id);
            return (
              <tr key={wallet.id}>
                <Cell>
                  <span className="font-medium text-white">{displayName(profile)}</span>
                  {profile?.email && <span className="block text-xs text-neutral-500">{profile.email}</span>}
                </Cell>
                <Cell className="font-semibold text-brand-gold">{totalBalance(wallet).toLocaleString('en-GB')}</Cell>
                <Cell>{wallet.lifetime_earned.toLocaleString('en-GB')}</Cell>
                <Cell className="whitespace-nowrap">{formatDateTime(wallet.updated_at)}</Cell>
              </tr>
            );
          })}
        </Table>
      )}
      <Pagination basePath="/admin/rewards" page={page} total={count ?? 0} />
    </>
  );
}
