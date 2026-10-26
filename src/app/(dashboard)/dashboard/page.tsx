import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { getUserRoles } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile, fetchWallet } from '@/lib/profile/service';
import { getRecentActivity } from '@/lib/activity/service';
import { totalBalance } from '@/lib/types/scores';
import { EarningNudges } from '@/components/dashboard/EarningNudges';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, wallet, activity, roles] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchWallet(supabase, user.id),
    getRecentActivity(supabase, user.id, 6),
    getUserRoles(user.id),
  ]);

  const walletData = wallet.success ? wallet.data : null;
  const balance = totalBalance(walletData);
  const flexi = walletData?.flexi_balance ?? 0;
  const reward = walletData?.reward_balance ?? 0;
  const name = profile.success
    ? (profile.data.display_name || profile.data.full_name || 'Player').split(' ')[0]
    : user.email?.split('@')[0] ?? 'Player';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Greeting ── */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          {greeting}, {name}
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Slough CC · 2026 Season
        </p>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { href: '/scorecard',   icon: '📋', label: 'Live scorecard' },
          { href: '/analyse',     icon: '🎯', label: 'AI Coach' },
          { href: '/highlights',  icon: '🎬', label: 'Highlights' },
          { href: '/marketplace', icon: '🛍️', label: 'Redeem' },
        ].map(a => (
          <Link
            key={a.href}
            href={a.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 10px',
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{a.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px', alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          {/* AI earning nudges */}
          <EarningNudges />

          {/* Recent activity */}
          <RecentActivity items={activity} />

          {/* Quick nav to features */}
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 14px' }}>
              Explore
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { href: '/coaching-history', icon: '📈', label: 'Progress', sub: 'Track AI metrics' },
                { href: '/companion',        icon: '🧠', label: 'Companion', sub: 'Cricket assistant' },
                { href: '/club-alumni',      icon: '🏆', label: 'Alumni', sub: 'Club legends' },
                { href: '/leaderboards',     icon: '📊', label: 'Leaderboard', sub: 'Scores rankings' },
                { href: '/gut-feeling',      icon: '🔮', label: 'Predictions', sub: 'Earn on match calls' },
                { href: '/finance',          icon: '💷', label: 'Finance', sub: 'Club accounts' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    textDecoration: 'none',
                    transition: 'background 0.12s',
                  }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#fff' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{item.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — wallet + streak */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Scores wallet */}
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 12px' }}>
              My Scores
            </p>
            <p style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '40px',
              color: '#c9a54c',
              margin: '0 0 2px',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>
              {balance.toLocaleString()}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
              ≈ £{(balance / 50).toFixed(2)} value
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px' }}>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Flexi</p>
                <p style={{ margin: '3px 0 0', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>{flexi.toLocaleString()}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px' }}>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Reward</p>
                <p style={{ margin: '3px 0 0', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>{reward.toLocaleString()}</p>
              </div>
            </div>
            <Link
              href="/marketplace"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                background: 'rgba(201,165,76,0.12)',
                border: '1px solid rgba(201,165,76,0.25)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#c9a54c',
                textDecoration: 'none',
              }}
            >
              Redeem Scores →
            </Link>
          </div>

          {/* How to earn */}
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '18px 20px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 12px' }}>
              How to earn
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { pts: '+5',   label: 'Mark available' },
                { pts: '+25',  label: 'AI coaching session' },
                { pts: '+50',  label: 'Play in a match' },
                { pts: '+100', label: 'Refer a friend' },
              ].map(e => (
                <div key={e.pts} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{e.label}</span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#c9a54c',
                    background: 'rgba(201,165,76,0.08)',
                    border: '1px solid rgba(201,165,76,0.2)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                  }}>{e.pts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin shortcut */}
          {roles.includes('admin') && (
            <Link
              href="/admin/club"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
                background: 'rgba(155,28,28,0.08)',
                border: '1px solid rgba(155,28,28,0.2)',
                borderRadius: '14px',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>Club admin</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Manage Slough CC</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
