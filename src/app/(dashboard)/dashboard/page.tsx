import type { CSSProperties } from 'react';
import { cookies } from 'next/headers';
import { fetchProfile } from '@/lib/profile/service';
import { ROLE_COOKIE, homeRole, rolePagesFor, roleTools } from '@/lib/nav/role-pages';
import { getRoleData } from '@/lib/roles/data';
import { RolePageView } from '@/components/roles/RolePageView';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRecentActivity } from '@/lib/activity/service';
import { getPrimaryClubId } from '@/lib/scores/context';
import { getPlaySummary } from '@/lib/actions/scores-engine';
import { getMyFixtures } from '@/lib/actions/availability';
import { formatScores } from '@/lib/utils/format';
import { NextMatchCard } from '@/components/dashboard/NextMatchCard';
import { getAudience } from '@/lib/nav/audience';
import { getAdminClubIds } from '@/lib/mobile/club-data';
import { PILLARS, pillarCounts } from '@/lib/nav/pillars';
import { MagicCard } from '@/components/magic/MagicCard';

const SYNE = "'Syne', sans-serif";
const hint: CSSProperties = { fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const user = await requireUser();
  const supabase = await createClient();
  const clubId = await getPrimaryClubId(user.id);
  const [{ as: asked }, jar] = await Promise.all([searchParams, cookies()]);

  const [profile, play, fixtures, club, activity, base, adminClubs] = await Promise.all([
    fetchProfile(supabase, user.id),
    getPlaySummary(),
    clubId ? getMyFixtures(clubId) : Promise.resolve([]),
    clubId ? createAdminClient().from('clubs').select('name').eq('id', clubId).maybeSingle() : Promise.resolve({ data: null }),
    getRecentActivity(supabase, user.id, 5),
    getAudience(user.id),
    getAdminClubIds(user.id),
  ]);

  // A club admin is recognised the same way the menu recognises one
  const audience = { ...base, admin: base.admin || adminClubs.length > 0 };
  const pages = rolePagesFor(audience);
  const page = homeRole(audience, asked, jar.get(ROLE_COOKIE)?.value);
  const roleData = page ? await getRoleData(page.role, user.id) : null;
  const counts = pillarCounts(audience);
  // Players, coaches and club admins can say whether they are available for the next match
  const plays = audience.admin || audience.roles.includes('player') || audience.roles.includes('coach');

  const name = profile.success
    ? (profile.data.display_name || profile.data.full_name || 'You').split(' ')[0]
    : user.email?.split('@')[0] ?? 'You';
  const clubName = (club.data?.name as string | undefined) ?? 'Your club';

  // UK time, so the greeting is right whatever clock the server keeps
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Recent: the Scores ledger when there is one, otherwise matches and steps
  const recent: Array<{ id: string; title: string; amount: number }> = play.success && play.data.recent.length > 0
    ? play.data.recent.slice(0, 5).map((r) => ({ id: r.id, title: r.label, amount: r.amount }))
    : activity.map((a) => ({ id: a.id, title: a.title, amount: a.amount }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: "'Inter', sans-serif" }}>
      {/* The dashboard for the role this person is using. Someone with none of the four roles gets a greeting. */}
      {page && roleData ? (
        <RolePageView home page={page} pages={pages} name={name} data={roleData} tools={roleTools(page.role, audience)} />
      ) : (
        <h1 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '26px', color: '#fff', margin: '4px 0 6px', letterSpacing: '-0.3px' }}>
          {greeting}, {name}
        </h1>
      )}

      <NextMatchCard fixture={fixtures[0] ?? null} clubName={clubName} canPlay={plays} />

      {/* The four pillars: the way in to everything */}
      <h2 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '20px', color: '#fff', margin: '8px 0 -4px', letterSpacing: '-0.01em' }}>Explore ClubPulse</h2>
      <section aria-label="The four pillars" className="mg-bento mg-two">
        {PILLARS.map((p, i) => (
          <MagicCard key={p.key} href={p.href} tint={p.from} index={i} style={{ padding: '18px', '--mg-from': p.from, '--mg-to': p.to } as CSSProperties}>
            <span aria-hidden style={{ fontSize: '26px', lineHeight: 1 }}>{p.icon}</span>
            <p className="mg-shine" style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em', margin: '10px 0 4px' }}>{p.title}</p>
            <p style={{ ...hint, margin: 0 }}>{p.short}</p>
            <p style={{ fontSize: '12px', fontWeight: 700, color: p.from, margin: '10px 0 0' }}>
              {counts[p.key] > 0 ? `${counts[p.key]} ${counts[p.key] === 1 ? 'page' : 'pages'}` : 'On the way'}
            </p>
          </MagicCard>
        ))}
      </section>

      <section aria-label="Recent" style={{ marginTop: '6px' }}>
        <h2 style={{ fontFamily: SYNE, fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 6px' }}>Recent</h2>
        {recent.length === 0 ? (
          <p style={hint}>Nothing yet. Check in, play a game or mark your availability to start earning.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recent.map((r) => (
              <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                <span style={{ flexShrink: 0, fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: r.amount >= 0 ? '#22C55E' : '#F87171' }}>
                  {r.amount >= 0 ? '+' : '−'}{formatScores(Math.abs(r.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

