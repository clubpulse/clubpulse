import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseAdminStats } from '@/lib/platform-admin';
import { ErrorNote, PageHeader, StatCard } from '@/components/platform-admin/ui';

export const metadata: Metadata = { title: 'Admin | ClubPulse' };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc('admin_stats');
  const stats = parseAdminStats(data);

  return (
    <>
      <PageHeader title="Dashboard" description="Platform-wide totals across all users." />
      {error && <ErrorNote message={`Couldn’t load stats (${error.message}). Has the admin_role migration been run?`} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total users" value={stats.totalUsers} accent="crimson" />
        <StatCard label="Analyse sessions" value={stats.analyseSessions} />
        <StatCard
          label="Points issued"
          value={stats.pointsIssued}
          hint={stats.pointsInCirculation === null ? undefined : `${stats.pointsInCirculation.toLocaleString('en-GB')} in circulation`}
        />
        <StatCard label="Marketplace clicks" value={stats.marketplaceClicks} accent="crimson" />
        <StatCard label="Highlight reels" value={stats.highlightReels} hint={`${stats.totalClips.toLocaleString('en-GB')} clips in total`} />
      </div>
    </>
  );
}
