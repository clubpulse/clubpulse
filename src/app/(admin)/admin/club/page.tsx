import Link from 'next/link';
import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubOverview } from '@/lib/admin/service';
import { ClubHealthScore } from '@/components/admin/ClubHealthScore';

const FEATURE_GROUPS = [
  {
    section: 'Scores & Rewards',
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.18)',
    features: [
      { href: '/admin/club/multipliers', icon: '✖️', label: 'Tier Multipliers', desc: 'Bronze / Silver / Gold · Youth ×1.25' },
      { href: '/admin/club/sport-configs', icon: '⚙️', label: 'Earning Rules', desc: 'Configure Scores per action per sport' },
      { href: '/admin/club/fee-offset', icon: '💳', label: 'Fee Offset', desc: 'Let players pay match fees with Scores' },
      { href: '/admin/club/community-pot', icon: '🫙', label: 'Community Pot', desc: 'Club bonus pool & collective targets' },
      { href: '/admin/club/sponsor-a-kid', icon: '👦', label: 'Sponsor a Kid', desc: 'Parent/member sponsors a junior\'s kit' },
      { href: '/admin/club/raffle', icon: '🎟️', label: 'Raffle', desc: 'Scores-funded prize draws' },
      { href: '/admin/club/scratch-cards', icon: '🎰', label: 'Scratch Cards', desc: 'Mystery prize reveal · weighted prize pool' },
    ],
  },
  {
    section: 'Fixtures & Operations',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.18)',
    features: [
      { href: '/admin/club/availability', icon: '📅', label: 'Availability', desc: 'Player availability grid for all fixtures' },
      { href: '/admin/club/volunteers', icon: '🙋', label: 'Volunteers', desc: 'Approve volunteer check-ins & hours' },
      { href: '/admin/club/travel', icon: '🚗', label: 'Travel', desc: 'Car shares & away match logistics' },
      { href: '/admin/club/match-mood', icon: '🌡️', label: 'Match Mood', desc: 'Pre/post match sentiment tracker' },
      { href: '/admin/club/gut-feeling', icon: '🧠', label: 'Selection Gut Feeling', desc: 'AI-assisted team selection notes' },
      { href: '/admin/club/form-guide', icon: '📈', label: 'Form Guide', desc: 'Player form trends across matches' },
      { href: '/admin/club/scout-mode', icon: '🔭', label: 'Scout Mode', desc: 'Share a read-only profile with coaches' },
      { href: '/admin/club/transfer-window', icon: '🔄', label: 'Transfer Window', desc: 'Player in/out requests & history' },
      { href: '/admin/club/auction', icon: '🔨', label: 'Player Auction', desc: 'Mini-IPL draft for internal leagues' },
    ],
  },
  {
    section: 'Player Development',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.18)',
    features: [
      { href: '/admin/club/health', icon: '❤️', label: 'Club Health', desc: 'AI health score, churn & retention alerts' },
      { href: '/admin/club/health-report', icon: '📊', label: 'Health Report', desc: 'Full engagement & attendance breakdown' },
      { href: '/admin/club/wellbeing', icon: '🧘', label: 'Wellbeing', desc: 'Player wellbeing check-ins & flags' },
      { href: '/admin/club/injury-intel', icon: '🩹', label: 'Injury Intel', desc: 'Injury log, return dates & risk flags' },
      { href: '/admin/club/qualifications', icon: '🎓', label: 'Qualifications', desc: 'DBS, coaching certs & renewal alerts' },
      { href: '/admin/club/school', icon: '🏫', label: 'School & Juniors', desc: 'Youth pathway, school links & U18 gate' },
    ],
  },
  {
    section: 'Club Hub',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.18)',
    features: [
      { href: '/admin/club/noticeboard', icon: '📌', label: 'Noticeboard', desc: 'Post announcements to all members' },
      { href: '/admin/club/documents', icon: '📄', label: 'Documents', desc: 'Constitutions, policies & club docs' },
      { href: '/admin/club/club-bible', icon: '📖', label: 'Club Bible', desc: 'History, values & traditions' },
      { href: '/admin/club/charity', icon: '❤️‍🔥', label: 'Charity', desc: 'Fundraising campaigns & totals' },
      { href: '/admin/club/curse-the-pitch', icon: '⚡', label: 'Curse the Pitch', desc: 'Superstition / fun social rituals' },
    ],
  },
  {
    section: 'Members',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.08)',
    border: 'rgba(13,148,136,0.18)',
    features: [
      { href: '/admin/club/members', icon: '👥', label: 'Members', desc: 'Roster, roles, Scores balances' },
      { href: '/admin/club/waiting-list', icon: '⏳', label: 'Waiting List', desc: 'Manage membership applications' },
      { href: '/admin/club/alumni', icon: '🏆', label: 'Alumni', desc: 'Former members & hall of fame' },
    ],
  },
  {
    section: 'Finance',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    border: 'rgba(5,150,105,0.18)',
    features: [
      { href: '/admin/club/finance', icon: '💷', label: 'Finance Overview', desc: 'Payments, fees & cashflow summary' },
      { href: '/admin/merchant', icon: '🏦', label: 'Merchant Wallet', desc: 'Club Scores balance & cashout to bank' },
    ],
  },
];

export default async function ClubOverviewPage() {
  const { user, clubId } = await requireClubAdminPage();
  const overview = await getClubOverview(user.id, clubId);

  if (!overview.success) {
    return <p style={{ fontSize: '14px', color: '#f87171' }}>Couldn&apos;t load your club: {overview.error}</p>;
  }
  const { club, memberCount, pendingVolunteers, activeMultipliers } = overview.data;

  const totalFeatures = FEATURE_GROUPS.reduce((n, g) => n + g.features.length, 0);

  const stats = [
    { label: 'Active members', value: memberCount, href: '/admin/club/members' },
    { label: 'Pending volunteers', value: pendingVolunteers, href: '/admin/club/volunteers' },
    { label: 'Active multipliers', value: activeMultipliers, href: '/admin/club/multipliers' },
    { label: 'Admin features', value: totalFeatures, href: '#features' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '26px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.4px',
        }}>
          {club?.name ?? 'Your club'}
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Admin dashboard · full feature review
        </p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#07102B',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '16px',
            }}>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
                {stat.label}
              </p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#fff', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
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
          background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)',
          borderRadius: '12px', padding: '14px', fontSize: '13px', color: '#fde047',
        }}>
          No ground location set — volunteers can&apos;t check in. Add ground_lat and ground_lng to the clubs table.
        </div>
      )}

      {/* Full feature map */}
      <div id="features">
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px',
          color: '#fff', margin: '0 0 20px', letterSpacing: '-0.2px',
        }}>
          All {totalFeatures} admin features — tap any to explore
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {FEATURE_GROUPS.map((group) => (
            <div key={group.section}>
              {/* Section header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '12px',
              }}>
                <div style={{
                  height: '1px', flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                }} />
                <span style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
                  textTransform: 'uppercase', color: group.color, whiteSpace: 'nowrap',
                }}>
                  {group.section}
                </span>
                <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>

              {/* Feature cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
              }}>
                {group.features.map((feat) => (
                  <Link key={feat.href} href={feat.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: group.bg,
                      border: `1px solid ${group.border}`,
                      borderRadius: '12px', padding: '14px',
                      display: 'flex', flexDirection: 'column', gap: '6px',
                      transition: 'opacity 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>{feat.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{feat.label}</span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: '15px' }}>
                        {feat.desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
