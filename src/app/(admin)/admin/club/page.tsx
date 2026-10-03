import Link from 'next/link';
import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubOverview } from '@/lib/admin/service';
import { Card } from '@/components/ui/Card';

export default async function ClubOverviewPage() {
  const { user, clubId } = await requireClubAdminPage();
  const overview = await getClubOverview(user.id, clubId);

  if (!overview.success) {
    return <p className="text-sm text-red-400">Couldn&apos;t load your club: {overview.error}</p>;
  }
  const { club, memberCount, pendingVolunteers, activeMultipliers } = overview.data;

  const stats = [
    { label: 'Active members', value: memberCount, href: '/admin/club/members' },
    { label: 'Pending volunteers', value: pendingVolunteers, href: '/admin/club/volunteers' },
    { label: 'Active multipliers', value: activeMultipliers, href: '/admin/club/multipliers' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{club?.name ?? 'Your club'}</h1>
        <p className="text-sm text-neutral-400">Club overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <Card className="transition hover:border-neutral-600">
              <p className="text-xs uppercase text-neutral-500">{stat.label}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-white">{stat.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {club && (club.ground_lat === null || club.ground_lng === null) && (
        <Card className="border-yellow-900/60">
          <p className="text-sm text-yellow-300">
            This club has no ground location set, so volunteers can&apos;t check in. Add ground_lat and ground_lng to the clubs table.
          </p>
        </Card>
      )}
    </div>
  );
}
