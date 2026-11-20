// Home. The same shape as the website's Home: the next match first, then six tiles, then the
// phone-only steps cards, a grouped menu that depends on the person's roles, and recent Scores.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StepsCard } from '../../components/StepsCard';
import { StreakCard } from '../../components/StreakCard';
import { useScoresWallet } from '../../hooks/useScoresWallet';
import { useSteps } from '../../hooks/useSteps';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { api, ApiError } from '../../lib/api';
import { ROLE_CONFIG, pendingRoles } from '../../lib/roles';
import { menuFor, type MenuGroup } from '../../lib/menu';
import { UpsellBanner } from '../../components/UpsellBanner';
import { DEALS_ENABLED, STORE_ENABLED } from '../../constants/features';
import { colors, fonts, spacing, radius } from '../../constants/theme';

type Home = {
  club: string | null;
  junior: boolean;
  fixture: { id: string; opponent: string; date: string; time: string | null; venue: string | null; format: string; myStatus: string } | null;
  streak: { day: number; doneToday: boolean };
  league: { rank: number; behind: number; aheadRank: number | null } | null;
  cards: { on: boolean; waiting: number; milestone: number | null; into: number; hint: string | null };
  insights: string[];
  recent: Array<{ id: string; title: string; amount: number }>;
};

const FORMAT: Record<string, string> = { league: 'League match', cup: 'Cup match', friendly: 'Friendly', tour: 'Tour match' };
const num = (n: number) => n.toLocaleString('en-GB');
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

function matchWhen(date: string, time: string | null) {
  const day = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  if (!time) return { day, time: null as string | null };
  const [h, m] = time.split(':').map(Number);
  return { day, time: `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { wallet, refresh: refreshWallet } = useScoresWallet();
  const steps = useSteps();
  const router = useRouter();
  const { roles, active, isAdmin, isCoach, isPlayer, club, juniors, approvalQueue, error: rolesError, refresh: refreshRoles } = useRoles();
  const [refreshing, setRefreshing] = useState(false);
  const [home, setHome] = useState<Home | null>(null);
  const [homeError, setHomeError] = useState(false);
  const [rewardsReady, setRewardsReady] = useState(0);
  const [saving, setSaving] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    try {
      setHome(await api<Home>('/api/home'));
      setHomeError(false);
    } catch {
      setHomeError(true);
    }
  }, []);

  // Roles, rewards and Scores all change elsewhere in the app, so reload on return
  useFocusEffect(
    useCallback(() => {
      refreshRoles();
      refreshWallet();
      loadHome();
      api<{ ready: number }>('/api/rewards').then((r) => setRewardsReady(r.ready)).catch(() => setRewardsReady(0));
    }, [refreshRoles, refreshWallet, loadHome]),
  );

  // A steps sync can add Scores a moment after Home opens, so reload the wallet when one lands
  const stepsScoresToday = steps.result?.totalScoresToday;
  useEffect(() => {
    if (stepsScoresToday !== undefined) refreshWallet();
  }, [stepsScoresToday, refreshWallet]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshWallet(), steps.refresh(), refreshRoles(), loadHome()]);
    setRefreshing(false);
  }, [refreshWallet, steps, refreshRoles, loadHome]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Player';
  const pending = pendingRoles(roles);
  const balance = (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0);
  // Players, coaches and club admins get the playing parts; so does anyone with no role yet
  const plays = isPlayer || isCoach || isAdmin || active.length === 0;
  const pendingJuniors = juniors.filter((j) => j.link_status === 'pending' || !j.consent_given).length;
  const badges: Record<string, number> = { club: isAdmin ? approvalQueue.length : 0, children: pendingJuniors, rewards: rewardsReady };

  const groups = menuFor({
    roles: active,
    junior: home?.junior ?? false,
    switches: { store: STORE_ENABLED, deals: DEALS_ENABLED, cards: home?.cards.on ?? false },
  });

  async function reply(status: 'available' | 'unavailable' | 'unknown') {
    if (!home?.fixture || saving) return;
    const before = home.fixture.myStatus;
    setSaving(true);
    setMatchError('');
    setHome({ ...home, fixture: { ...home.fixture, myStatus: status } });
    try {
      await api('/api/home/availability', { method: 'POST', body: { fixtureId: home.fixture.id, status } });
    } catch (e) {
      setHome((h) => (h?.fixture ? { ...h, fixture: { ...h.fixture, myStatus: before } } : h));
      setMatchError(e instanceof ApiError ? e.message : 'Could not save. Please try again.');
    }
    setSaving(false);
  }

  const fixture = home?.fixture ?? null;
  const when = fixture ? matchWhen(fixture.date, fixture.time) : null;
  const available = fixture?.myStatus === 'available';
  const streak = home?.streak ?? { day: 0, doneToday: false };
  const cards = home?.cards;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.gold} />}
      >
        {/* ── Greeting ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good {getGreeting()}, {firstName}</Text>
            {(home?.club ?? club?.name) && <Text style={[fonts.small, { marginTop: 2 }]}>{home?.club ?? club?.name}</Text>}
          </View>
          <Pressable onPress={() => router.push('/wallet')} style={styles.scoreBadge} accessibilityRole="button" accessibilityLabel={`${num(balance)} Scores. Open wallet`}>
            <Text style={styles.scoreBadgeText}>⭐ {num(balance)}</Text>
          </Pressable>
        </View>

        <View style={styles.roleBadgeRow}>
          {active.map((role) => {
            // Each role opens its own page. Volunteer has none, so it opens the shifts.
            const page = role === 'club_admin' ? 'admin' : role === 'volunteer' ? null : role;
            return (
              <Pressable
                key={role}
                onPress={() => router.push((page ? `/role/${page}` : '/(tabs)/shifts') as never)}
                accessibilityRole="button"
                accessibilityLabel={`${ROLE_CONFIG[role].label}. Open ${page ? 'your page' : 'volunteer shifts'}`}
                style={({ pressed }) => [styles.roleBadge, { backgroundColor: ROLE_CONFIG[role].dimColor, borderWidth: 1, borderColor: `${ROLE_CONFIG[role].color}55` }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.roleBadgeText, { color: ROLE_CONFIG[role].color }]}>{ROLE_CONFIG[role].icon} {ROLE_CONFIG[role].label}  ›</Text>
              </Pressable>
            );
          })}
          {pending.map((role) => (
            <View key={`p-${role}`} style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
              <Text style={[styles.roleBadgeText, { color: colors.textMuted as string }]}>⏳ {ROLE_CONFIG[role].label}</Text>
            </View>
          ))}
        </View>

        {(rolesError || homeError) && (
          <View style={styles.notice}>
            <Text style={fonts.small}>We couldn&apos;t load everything, so some parts may be missing. Pull down to try again.</Text>
          </View>
        )}

        {/* ── Next match ── */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Next match{when ? ` · ${when.day}` : ''}</Text>
          {!home && !homeError ? (
            <ActivityIndicator color={colors.white} style={{ alignSelf: 'flex-start', marginVertical: spacing.md }} />
          ) : fixture ? (
            <>
              <Text style={styles.heroTitle}>{home?.club ?? 'Your club'} v {fixture.opponent}</Text>
              <Text style={styles.heroSub}>{[when?.time, fixture.venue, FORMAT[fixture.format] ?? null].filter(Boolean).join(' · ')}</Text>
              {!!matchError && <Text style={[styles.heroSub, { color: '#FCA5A5' }]}>{matchError}</Text>}
              {plays && (
                <View style={styles.heroButtons}>
                  <Pressable
                    onPress={() => reply(available ? 'unknown' : 'available')}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityState={{ selected: available }}
                    style={[styles.heroBtn, { backgroundColor: available ? colors.success : colors.white }]}
                  >
                    <Text style={[styles.heroBtnText, { color: available ? '#052E16' : '#1E3A8A' }]}>{available ? '✓ You are available' : "I'm available"}</Text>
                  </Pressable>
                  {!available && (
                    <Pressable onPress={() => reply('unavailable')} disabled={saving} accessibilityRole="button" style={[styles.heroBtn, styles.heroBtnGhost]}>
                      <Text style={[styles.heroBtnText, { color: colors.white }]}>{fixture.myStatus === 'unavailable' ? "✗ Can't play" : "Can't play"}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>No fixtures yet</Text>
              <Text style={styles.heroSub}>Your club has not added its next match.</Text>
            </>
          )}
        </View>

        {/* ── Tiles ── */}
        <View style={styles.tileRow}>
          <Tile icon="⭐" onPress={() => router.push('/wallet')}>
            <Text style={[styles.tileBig, { color: colors.gold }]} numberOfLines={1} adjustsFontSizeToFit>{num(balance)}</Text>
            <Text style={styles.tileLabel}>Scores</Text>
            <Text style={styles.tileHint}>≈ £{(balance / 50).toFixed(2)} to spend</Text>
          </Tile>
          <Tile icon="🔥" onPress={() => router.push('/rewards')}>
            <Text style={styles.tileBig}>{streak.day}</Text>
            <Text style={styles.tileLabel}>Day streak</Text>
            <Text style={styles.tileHint}>{streak.doneToday ? 'Checked in today' : streak.day > 0 ? 'Check in to keep it' : 'Check in to start one'}</Text>
          </Tile>
        </View>

        <View style={styles.tileRow}>
          <Tile icon="🏆" onPress={() => router.push('/rewards')}>
            <Text style={styles.tileBig}>{home?.league ? ordinal(home.league.rank) : '–'}</Text>
            <Text style={styles.tileLabel}>Club league</Text>
            <Text style={styles.tileHint}>
              {!home?.league ? 'Earn Scores to join the table'
                : home.league.aheadRank ? `${num(home.league.behind)} behind ${ordinal(home.league.aheadRank)}`
                : 'Top this week'}
            </Text>
          </Tile>
          {cards?.on ? (
            <Tile icon="🎟️" onPress={() => router.push('/scratch-cards')}>
              {cards.waiting > 0 ? (
                <>
                  <Text style={[styles.tilePhrase, { color: colors.gold }]}>{cards.waiting} to open</Text>
                  <Text style={styles.tileLabel}>Scratch cards</Text>
                  <Text style={styles.tileHint}>Tap to scratch</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.tileLabel, { marginTop: spacing.sm }]}>Next scratch card</Text>
                  <Progress value={cards.milestone ? cards.into : streak.day} max={cards.milestone ?? 7} />
                  <Text style={styles.tileHint}>
                    {cards.milestone ? `${num(cards.milestone - cards.into)} more to go` : cards.hint ?? `Day ${streak.day} of 7`}
                  </Text>
                </>
              )}
            </Tile>
          ) : (
            <Tile icon="🛍️" onPress={() => router.push('/marketplace')}>
              <Text style={[styles.tilePhrase, { color: colors.gold }]}>Spend Scores</Text>
              <Text style={styles.tileLabel}>Rewards</Text>
              <Text style={styles.tileHint}>See what you can get</Text>
            </Tile>
          )}
        </View>

        <View style={styles.tileRow}>
          {plays ? (
            <Tile icon="🎯" onPress={() => router.push('/coaching')}>
              <Text style={[styles.tileLabel, { marginTop: spacing.sm }]}>Video coach</Text>
              {(home?.insights ?? []).length > 0 ? (
                home!.insights.map((line, i) => (
                  <Text key={line} numberOfLines={2} style={[styles.insight, { color: i === 0 ? colors.success : colors.orange }]}>{line}</Text>
                ))
              ) : (
                <>
                  <Text style={styles.tilePhrase}>Film a clip</Text>
                  <Text style={styles.tileHint}>Get a score and what to work on</Text>
                </>
              )}
            </Tile>
          ) : (
            <Tile icon="🤝" onPress={() => router.push('/(tabs)/shifts')}>
              <Text style={[styles.tileLabel, { marginTop: spacing.sm }]}>Help out</Text>
              <Text style={styles.tilePhrase}>Shifts</Text>
              <Text style={styles.tileHint}>See where the club needs a hand</Text>
            </Tile>
          )}
          <Tile icon="🎮" onPress={() => router.push('/games' as never)}>
            <Text style={[styles.tileLabel, { marginTop: spacing.sm }]}>Today&apos;s games</Text>
            <Text style={styles.tilePhrase}>5 games</Text>
            <Text style={styles.tileHint}>Quizzes, Season Manager and the Auction Room</Text>
          </Tile>
        </View>

        {/* ── Steps: only on the phone ── */}
        <StepsCard
          steps={steps.steps}
          source={steps.source}
          status={steps.status}
          syncing={steps.syncing}
          result={steps.result}
          error={steps.error}
          onSync={refreshAll}
        />
        <StreakCard streakDay={steps.result?.streakDay ?? 0} onUsed={refreshWallet} />

        {/* ── Menu, by role ── */}
        {groups.map((group) => (
          <MenuSection
            key={group.key}
            group={group}
            open={open === group.key}
            onToggle={() => setOpen(open === group.key ? null : group.key)}
            badges={badges}
            onOpen={(route) => router.push(route as never)}
          />
        ))}

        {/* ── Recent ── */}
        <Text style={styles.recentTitle}>Recent</Text>
        {(home?.recent ?? []).length === 0 ? (
          <Text style={fonts.small}>Nothing yet. Check in, walk or mark your availability to start earning.</Text>
        ) : (
          home!.recent.map((r) => (
            <View key={r.id} style={styles.recentRow}>
              <Text style={[fonts.regular, { flex: 1 }]} numberOfLines={1}>{r.title}</Text>
              <Text style={[styles.recentAmount, { color: r.amount >= 0 ? colors.success : colors.danger }]}>
                {r.amount >= 0 ? '+' : '−'}{num(Math.abs(r.amount))}
              </Text>
            </View>
          ))
        )}

        <UpsellBanner trigger="social_proof" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Tile({ icon, onPress, children }: { icon: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.tile, pressed && { opacity: 0.75 }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      {children}
    </Pressable>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

function MenuSection({ group, open, onToggle, badges, onOpen }: {
  group: MenuGroup; open: boolean; onToggle: () => void; badges: Record<string, number>; onOpen: (route: string) => void;
}) {
  const waiting = group.links.reduce((a, l) => a + (badges[l.key] ?? 0), 0);
  return (
    <View style={[styles.group, open && { borderColor: `${group.tint}66` }]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.groupHead}>
        <View style={[styles.groupIcon, { backgroundColor: `${group.tint}26`, borderColor: `${group.tint}66` }]}>
          <Text style={{ fontSize: 17 }}>{group.icon}</Text>
        </View>
        <Text style={[fonts.title, { flex: 1 }]}>{group.label}</Text>
        {waiting > 0 && !open && (
          <View style={styles.notifBadge}><Text style={styles.notifText}>{waiting}</Text></View>
        )}
        <Text style={[styles.groupCount, { color: group.tint }]}>{group.links.length}</Text>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textSubtle} />
      </Pressable>
      {open && group.links.map((link) => (
        <Pressable key={link.key} onPress={() => onOpen(link.route)} accessibilityRole="button" style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
          <Text style={styles.linkIcon}>{link.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkLabel}>{link.label}</Text>
            <Text style={fonts.small} numberOfLines={1}>{link.detail}</Text>
          </View>
          {(badges[link.key] ?? 0) > 0 && (
            <View style={styles.notifBadge}><Text style={styles.notifText}>{badges[link.key]}</Text></View>
          )}
          <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
        </Pressable>
      ))}
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  scoreBadge: {
    backgroundColor: colors.goldDim as string, borderWidth: 1, borderColor: colors.goldBorder as string,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
  },
  scoreBadgeText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  roleBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  notice: { backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border as string, padding: spacing.md },

  hero: { backgroundColor: '#1D4ED8', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(96,165,250,0.45)', padding: spacing.xl },
  heroEyebrow: { color: '#BFDBFE', fontSize: 13, fontWeight: '600' },
  heroTitle: { color: colors.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 6 },
  heroButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  heroBtn: { borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 18 },
  heroBtnGhost: { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroBtnText: { fontSize: 14, fontWeight: '700' },

  tileRow: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border as string, padding: spacing.lg, minHeight: 138 },
  tileBig: { fontSize: 34, fontWeight: '800', color: colors.white, letterSpacing: -0.5, marginTop: 6 },
  tilePhrase: { fontSize: 19, fontWeight: '800', color: colors.white, marginTop: 6 },
  tileLabel: { fontSize: 14, fontWeight: '700', color: colors.white, marginTop: 2 },
  tileHint: { fontSize: 12, color: colors.textMuted as string, marginTop: 3 },
  insight: { fontSize: 13, fontWeight: '600', marginTop: 5 },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm, marginBottom: 4 },
  fill: { height: 6, backgroundColor: colors.gold, borderRadius: 3 },

  group: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border as string, overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  groupIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  groupCount: { fontSize: 12, fontWeight: '800' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: colors.border2 as string },
  linkIcon: { fontSize: 18, width: 36, textAlign: 'center' },
  linkLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  notifBadge: { backgroundColor: colors.danger, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  notifText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  recentTitle: { fontSize: 17, fontWeight: '700', color: colors.white, marginTop: spacing.sm },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border2 as string },
  recentAmount: { fontSize: 14, fontWeight: '700' },
});
