import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchProfile, fetchWallet } from '@/lib/profile/service';
import { getRecentActivity } from '@/lib/activity/service';
import { getPrimaryClubId } from '@/lib/scores/context';
import { getPlaySummary } from '@/lib/actions/scores-engine';
import { getGamesState } from '@/lib/actions/games';
import { getMyFixtures } from '@/lib/actions/availability';
import { getMyScratchCards } from '@/lib/scratch/service';
import { totalBalance } from '@/lib/types/scores';
import { formatScores } from '@/lib/utils/format';
import { NextMatchCard } from '@/components/dashboard/NextMatchCard';
import { getAudience } from '@/lib/nav/audience';
import type { CoachingInsight } from '@/lib/types/coaching-insights';

const SYNE = "'Syne', sans-serif";
const tile: CSSProperties = {
  display: 'block', background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px',
  padding: '22px', textDecoration: 'none', color: 'inherit', minWidth: 0,
};
const big: CSSProperties = { fontFamily: SYNE, fontWeight: 800, fontSize: '40px', lineHeight: 1, letterSpacing: '-0.02em', margin: '10px 0 8px' };
const label: CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 };
const hint: CSSProperties = { fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' };

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

function Tile({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  return (
    <Link href={href} style={tile} className="cp-home-tile">
      <span aria-hidden style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const clubId = await getPrimaryClubId(user.id);

  const [profile, wallet, play, games, fixtures, cards, club, insights, activity, audience] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchWallet(supabase, user.id),
    getPlaySummary(),
    getGamesState(),
    clubId ? getMyFixtures(clubId) : Promise.resolve([]),
    getMyScratchCards(user.id),
    clubId ? createAdminClient().from('clubs').select('name').eq('id', clubId).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from('coaching_insights')
      .select('id, player_id, match_id, generated_at, tier, insight_type, finding, recommendation, acknowledged')
      .eq('player_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(2)
      .returns<CoachingInsight[]>(),
    getRecentActivity(supabase, user.id, 5),
    getAudience(user.id),
  ]);

  // Players, coaches and club admins get the playing parts of Home; parents and volunteers get club news
  const plays = audience.admin || audience.roles.includes('player') || audience.roles.includes('coach');

  const walletData = wallet.success ? wallet.data : null;
  const balance = totalBalance(walletData);
  const name = profile.success
    ? (profile.data.display_name || profile.data.full_name || 'Player').split(' ')[0]
    : user.email?.split('@')[0] ?? 'Player';
  const clubName = (club.data?.name as string | undefined) ?? 'Your club';

  // UK time, so the greeting is right whatever clock the server keeps
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Day streak
  const checkin = play.success ? play.data.checkin : null;
  const streak = checkin?.lastDay ?? 0;

  // Club league
  const league = play.success ? play.data.league : [];
  const me = league.find((r) => r.isMe) ?? null;
  const ahead = me && me.rank > 1 ? league.find((r) => r.rank === me.rank - 1) ?? null : null;

  // Scratch cards
  const cardsOn = !cards.unavailable && cards.gate !== 'junior';
  const lifetime = walletData?.lifetime_earned ?? 0;
  const milestone = cards.milestone && cards.milestone > 0 ? cards.milestone : null;
  const intoMilestone = milestone ? lifetime % milestone : 0;

  // Games
  const gameList = games.success ? Object.values(games.data.games).filter((g) => g.enabled) : [];
  const toPlay = gameList.filter((g) => !g.played && !g.locked).length;
  const earnedToday = games.success ? games.data.earnedToday : 0;

  // Recent: the Scores ledger when there is one, otherwise matches and steps
  const recent: Array<{ id: string; title: string; amount: number }> = play.success && play.data.recent.length > 0
    ? play.data.recent.slice(0, 5).map((r) => ({ id: r.id, title: r.label, amount: r.amount }))
    : activity.map((a) => ({ id: a.id, title: a.title, amount: a.amount }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`.cp-home-tile{transition:border-color .15s,transform .15s}.cp-home-tile:hover{border-color:rgba(96,165,250,.45)!important;transform:translateY(-1px)}`}</style>

      <h1 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '26px', color: '#fff', margin: '4px 0 6px', letterSpacing: '-0.3px' }}>
        {greeting}, {name}
      </h1>

      <NextMatchCard fixture={fixtures[0] ?? null} clubName={clubName} canPlay={plays} />

      <div style={grid}>
        <Tile href="/play" icon="⭐">
          <p style={{ ...big, color: '#EFC84A' }}>{formatScores(balance)}</p>
          <p style={label}>Scores</p>
          <p style={hint}>≈ £{(balance / 50).toFixed(2)} to spend</p>
        </Tile>

        <Tile href="/play" icon="🔥">
          <p style={{ ...big, color: '#fff' }}>{streak}</p>
          <p style={label}>Day streak</p>
          <p style={hint}>
            {!checkin?.enabled ? 'Check in daily to build one'
              : checkin.doneToday ? 'Checked in today'
              : streak > 0 ? 'Check in to keep it' : 'Check in to start one'}
          </p>
        </Tile>

        <Tile href="/leaderboard" icon="🏆">
          <p style={{ ...big, color: '#fff' }}>{me ? ordinal(me.rank) : '–'}</p>
          <p style={label}>Club league</p>
          <p style={hint}>
            {!me ? 'Earn Scores to join the table'
              : ahead ? `${formatScores(Math.max(1, ahead.total - me.total))} behind ${ordinal(ahead.rank)}`
              : 'Top of the table'}
          </p>
        </Tile>
      </div>

      <div style={grid}>
        {cardsOn ? (
          <Tile href="/scratch-cards" icon="🎟️">
            <p style={{ ...label, margin: '12px 0 10px' }}>{cards.waiting.length > 0 ? 'Scratch cards' : 'Next scratch card'}</p>
            {cards.waiting.length > 0 ? (
              <>
                <p style={{ ...big, fontSize: '23px', color: '#EFC84A', margin: '0 0 6px' }}>{cards.waiting.length} to open</p>
                <p style={hint}>Tap to scratch</p>
              </>
            ) : milestone ? (
              <>
                <Progress value={intoMilestone} max={milestone} />
                <p style={hint}>{formatScores(intoMilestone)} / {formatScores(milestone)}</p>
                <p style={{ ...hint, color: 'rgba(255,255,255,0.75)' }}>{formatScores(milestone - intoMilestone)} more to go</p>
              </>
            ) : (
              <>
                <Progress value={streak} max={7} />
                <p style={hint}>Day {streak} of 7</p>
                <p style={{ ...hint, color: 'rgba(255,255,255,0.75)' }}>{cards.tasks[0] ?? 'A seven-day streak earns a card'}</p>
              </>
            )}
          </Tile>
        ) : (
          <Tile href="/marketplace" icon="🛍️">
            <p style={{ ...label, margin: '12px 0 10px' }}>Rewards</p>
            <p style={{ ...big, fontSize: '23px', color: '#EFC84A', margin: '0 0 6px' }}>Spend Scores</p>
            <p style={hint}>See what you can get</p>
          </Tile>
        )}

        {plays ? (
        <Tile href="/analyse" icon="🎯">
          <p style={{ ...label, margin: '12px 0 10px' }}>AI Coach</p>
          {(insights.data ?? []).length > 0 ? (
            (insights.data ?? []).map((i, n) => (
              <p key={i.id} style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px', color: n === 0 ? '#22C55E' : '#F97316', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {i.finding}
              </p>
            ))
          ) : (
            <>
              <p style={{ ...big, fontSize: '23px', color: '#fff', margin: '0 0 6px' }}>Film a clip</p>
              <p style={hint}>Get a score and what to work on</p>
            </>
          )}
        </Tile>
        ) : (
          <Tile href="/noticeboard" icon="📌">
            <p style={{ ...label, margin: '12px 0 10px' }}>Club news</p>
            <p style={{ ...big, fontSize: '23px', color: '#fff', margin: '0 0 6px' }}>Noticeboard</p>
            <p style={hint}>Notices and updates from {clubName}</p>
          </Tile>
        )}

        <Tile href="/games" icon="🎮">
          <p style={{ ...label, margin: '12px 0 10px' }}>Today&apos;s games</p>
          <p style={{ ...big, fontSize: '23px', color: '#fff', margin: '0 0 6px' }}>
            {gameList.length === 0 ? 'Not on yet' : toPlay > 0 ? `${toPlay} to play` : 'All played'}
          </p>
          <p style={hint}>
            {gameList.length === 0 ? 'Your club has not switched games on'
              : earnedToday > 0 ? `+${formatScores(earnedToday)} Scores earned today`
              : toPlay > 0 ? 'Play to earn Scores' : 'Back tomorrow'}
          </p>
        </Tile>
      </div>

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

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', margin: '0 0 10px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: '#EFC84A', borderRadius: '3px' }} />
    </div>
  );
}
