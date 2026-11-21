import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';

// Guard: club admins (club_members.role = 'admin'), merchants, and platform admins may enter.
// Each page then checks the specific right it needs.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  const isClubAdmin = ctx.adminClubIds.length > 0;

  if (!isClubAdmin && !ctx.isMerchant && !ctx.isPlatformAdmin) redirect('/dashboard');

  // Grouped nav sections — every admin/club/* page appears here
  const sections: { label: string; links: { href: string; label: string }[] }[] = isClubAdmin
    ? [
        {
          label: 'Club',
          links: [
            { href: '/admin/club', label: 'Overview' },
            { href: '/admin/club/members', label: 'Members' },
            { href: '/admin/club/waiting-list', label: 'Waiting list' },
            { href: '/admin/club/alumni', label: 'Alumni' },
          ],
        },
        {
          label: 'Scores & Rewards',
          links: [
            { href: '/admin/club/scores-rules', label: 'Scores controls 🎛️' },
            { href: '/admin/club/attendance', label: 'Training and fees' },
            { href: '/admin/club/multipliers', label: 'Multipliers' },
            { href: '/admin/club/sport-configs', label: 'Earning rules' },
            { href: '/admin/club/fee-offset', label: 'Fee offset' },
            { href: '/admin/club/community-pot', label: 'Community pot' },
            { href: '/admin/club/sponsor-a-kid', label: 'Sponsor a kid' },
            { href: '/admin/club/raffle', label: 'Raffle' },
            { href: '/admin/club/scratch-cards', label: 'Scratch cards 🎰' },
          ],
        },
        {
          label: 'Fixtures & Operations',
          links: [
            { href: '/admin/club/availability', label: 'Availability' },
            { href: '/admin/club/volunteers', label: 'Volunteers' },
            { href: '/admin/club/travel', label: 'Travel' },
            { href: '/admin/club/match-mood', label: 'Match mood' },
            { href: '/admin/club/gut-feeling', label: 'Selection gut feeling' },
            { href: '/admin/club/form-guide', label: 'Form guide' },
            { href: '/admin/club/scout-mode', label: 'Scout mode' },
            { href: '/admin/club/transfer-window', label: 'Transfer window' },
            { href: '/admin/club/auction', label: 'Player auction' },
          ],
        },
        {
          label: 'Player Development',
          links: [
            { href: '/admin/club/health', label: 'Club health' },
            { href: '/admin/club/health-report', label: 'Health report' },
            { href: '/admin/club/wellbeing', label: 'Wellbeing' },
            { href: '/admin/club/injury-intel', label: 'Injury intel' },
            { href: '/admin/club/qualifications', label: 'Qualifications' },
            { href: '/admin/club/school', label: 'School & juniors' },
          ],
        },
        {
          label: 'Club Hub',
          links: [
            { href: '/admin/club/noticeboard', label: 'Noticeboard' },
            { href: '/admin/club/documents', label: 'Documents' },
            { href: '/admin/club/club-bible', label: 'Club Bible' },
            { href: '/admin/club/charity', label: 'Charity' },
            { href: '/admin/club/curse-the-pitch', label: 'Curse the pitch ⚡' },
          ],
        },
        {
          label: 'Finance',
          links: [
            { href: '/admin/club/finance', label: 'Finance overview' },
            ...(ctx.isMerchant || ctx.isPlatformAdmin
              ? [{ href: '/admin/merchant', label: 'Merchant wallet' }]
              : []),
          ],
        },
      ]
    : [
        ...(ctx.isMerchant || ctx.isPlatformAdmin
          ? [{ label: 'Finance', links: [{ href: '/admin/merchant', label: 'Merchant wallet' }] }]
          : []),
      ];

  // ClubPulse staff: gift cards waiting to be ordered by hand while Tango API access is off
  if (ctx.isPlatformAdmin) {
    sections.push({ label: 'ClubPulse staff', links: [{ href: '/admin/gift-cards', label: 'Gift card orders 🎁' }, { href: '/admin/merchandise', label: 'Merchandise orders 🧢' }] });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#04091A', color: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#04091A',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '0 24px', height: '52px',
        }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '7px',
              background: '#2563EB', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff',
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}>C</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>Admin</span>
          </Link>

          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '16px' }}>·</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3px' }}>
            Club admin dashboard — Hari Anna review
          </span>

          <Link
            href="/dashboard"
            style={{ marginLeft: 'auto', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
          >
            ← Back to app
          </Link>
        </div>
      </header>

      <div style={{ display: 'flex', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Sidebar nav */}
        <aside style={{
          width: '220px', flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          minHeight: 'calc(100vh - 52px)',
          padding: '20px 0',
          position: 'sticky', top: '52px', alignSelf: 'flex-start',
          overflowY: 'auto',
        }}>
          {sections.map((section) => (
            <div key={section.label} style={{ marginBottom: '24px', padding: '0 12px' }}>
              <p style={{
                fontSize: '9.5px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '1px',
                color: 'rgba(255,255,255,0.25)', margin: '0 4px 8px',
              }}>
                {section.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {section.links.map((link) => (
                  <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '13px', color: 'rgba(255,255,255,0.65)',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLDivElement).style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      (e.currentTarget as HTMLDivElement).style.color = 'rgba(255,255,255,0.65)';
                    }}
                    >
                      {link.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Feature count badge */}
          <div style={{ padding: '0 16px', marginTop: '8px' }}>
            <div style={{
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: '8px', padding: '10px',
              fontSize: '11px', color: 'rgba(255,255,255,0.4)',
              lineHeight: '16px',
            }}>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                {sections.reduce((n, s) => n + s.links.length, 0)} admin features
              </span>
              {' '}across {sections.length} modules — tap any to review
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main style={{ flex: 1, padding: '32px 32px', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
