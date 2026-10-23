import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorNote, PageHeader, StatCard } from '@/components/platform-admin/ui';

export const metadata: Metadata = { title: 'Admin | ClubPulse' };

type Stats = {
  users: number; highlight_sessions: number; highlight_clips: number;
  points_issued: number; points_in_circulation: number; marketplace_clicks: number;
};

export default async function AdminDashboardPage() {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc('admin_stats').single<Stats>();
  const stats = data ?? { users: 0, highlight_sessions: 0, highlight_clips: 0, points_issued: 0, points_in_circulation: 0, marketplace_clicks: 0 };

  return (
    <>
      <PageHeader title="Dashboard" description="Platform-wide totals across all users." />
      {error && <ErrorNote message={`Couldn’t load stats (${error.message}). Has the admin_role migration been run?`} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total users" value={Number(stats.users)} accent="crimson" />
        <StatCard label="Analyse sessions" value={Number(stats.highlight_sessions)} hint="Sessions that produced a highlight reel" />
        <StatCard label="Points issued" value={Number(stats.points_issued)} hint={`${Number(stats.points_in_circulation).toLocaleString('en-GB')} in circulation`} />
        <StatCard label="Marketplace clicks" value={Number(stats.marketplace_clicks)} accent="crimson" />
        <StatCard label="Highlight reels" value={Number(stats.highlight_sessions)} hint={`${Number(stats.highlight_clips).toLocaleString('en-GB')} clips in total`} />
      </div>
    </>
  );
}
