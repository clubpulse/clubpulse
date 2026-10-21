import Link from 'next/link';
import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubOverview } from '@/lib/admin/service';
import { ClubHealthScore } from '@/components/admin/ClubHealthScore';

export default async function ClubOverviewPage() {
  const { user, clubId } = await requireClubAdminPage();
  const overview = await getClubOverview(user.id, clubId);

  if (!overview.success) {
    return <p style={{ fontSize: '14px', color: '#f87171' }}>Couldn&apos;t load your club: {overview.error}</p>;
  }
  const { club, memberCount, pendingVolunteers, activeMultipliers } = overview.data;

  const stats = [
    { label: 'Active members', value: memberCount, href: '/admin/club/members' },
    { label: 'Pending volunteers', value: pendingVolunteers, href: '/admin/club/volunteers' },
    { label: 'Active multipliers', value: activeMultipliers, href: '/admin/club/multipliers' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          {club?.name ?? 'Your club'}
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Club overview · Admin panel</p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '16px',
              transition: 'border-color 0.15s',
            }}>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
                {stat.label}
              </p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '36px', color: '#fff', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {stat.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* AI Club Health Score */}
      <ClubHealthScore />

      {/* Warning if no ground location */}
      {club && (club.ground_lat === null || club.ground_lng === null) && (
        <div style={{
          background: 'rgba(234,179,8,0.06)',
          border: '1px solid rgba(234,179,8,0.2)',
          borderRadius: '12px', padding: '14px',
          fontSize: '13px', color: '#fde047',
        }}>
          This club has no ground location set, so volunteers can&apos;t check in. Add ground_lat and ground_lng to the clubs table.
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {[
          { href: '/admin/club/members', label: 'Manage members', icon: '👥' },
          { href: '/admin/club/multipliers', label: 'Score multipliers', icon: '✖️' },
          { href: '/admin/club/sport-configs', label: 'Sport config', icon: '⚙️' },
          { href: '/admin/club/volunteers', label: 'Volunteer approvals', icon: '🙋' },
        ].map((link) => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '12px 14px',
              fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)',
              transition: 'border-color 0.15s',
            }}>
              <span style={{ fontSize: '16px' }}>{link.icon}</span>
              {link.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
