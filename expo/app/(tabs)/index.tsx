// Home. It opens with the dashboard for the role the person is using (Player, Coach, Parent or
// Admin), then the next match, the phone-only steps cards, the menu and recent Scores.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StepsCard } from '../../components/StepsCard';
import { StreakCard } from '../../components/StreakCard';
import { useScoresWallet } from '../../hooks/useScoresWallet';
import { useSteps } from '../../hooks/useSteps';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { api, ApiError } from '../../lib/api';
import { ROLE_CONFIG, pendingRoles } from '../../lib/roles';
import { menuFor, type MenuGroup } from '../../lib/menu';
import { isPageRole, rolePagesFor, type PageRole } from '../../lib/rolePages';
import { RoleDashboard, useRolePage } from '../../components/RoleDashboard';
import { UpsellBanner } from '../../components/UpsellBanner';
import { DEALS_ENABLED, STORE_ENABLED } from '../../constants/features';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

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

const ROLE_KEY = 'clubpulse.home.role';
const FORMAT: Record<string, string> = { league: 'League match', cup: 'Cup match', friendly: 'Friendly', tour: 'Tour match' };
const num = (n: number) => n.toLocaleString('en-GB');

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
  const { roles, active, isAdmin, isCoach, isPlayer, club, juniors, approvalQueue, loading: rolesLoading, error: rolesError, refresh: refreshRoles } = useRoles();
  const [refreshing, setRefreshing] = useState(false);
  const [home, setHome] = useState<Home | null>(null);
  const [homeError, setHomeError] = useState(false);
  const [rewardsReady, setRewardsReady] = useState(0);
  const [saving, setSaving] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [open, setOpen] = useState<string | null>('scores');
  const [chosen, setChosen] = useState<PageRole | null>(null);

  // The dashboard Home opens with: the role last used on this phone, or the first one held
  const pages = rolePagesFor(active);
  const role: PageRole | null = rolesLoading && active.length === 0 ? null : chosen && pages.includes(chosen) ? chosen : pages[0] ?? null;
  const rolePage = useRolePage(role);
  const loadRolePage = rolePage.load;

  useEffect(() => {
    AsyncStorage.getItem(ROLE_KEY).then((v) => { if (isPageRole(v)) setChosen(v); }).catch(() => {});
  }, []);

  const chooseRole = useCallback((r: PageRole) => {
    setChosen(r);
    AsyncStorage.setItem(ROLE_KEY, r).catch(() => {});
  }, []);

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
      loadRolePage();
      api<{ ready: number }>('/api/rewards').then((r) => setRewardsReady(r.ready)).catch(() => setRewardsReady(0));
    }, [refreshRoles, refreshWallet, loadHome, loadRolePage]),
  );

  // A steps sync can add Scores a moment after Home opens, so reload the wallet when one lands
  const stepsScoresToday = steps.result?.totalScoresToday;
  useEffect(() => {
    if (stepsScoresToday !== undefined) refreshWallet();
  }, [stepsScoresToday, refreshWallet]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshWallet(), steps.refresh(), refreshRoles(), loadHome(), loadRolePage()]);
    setRefreshing(false);
  }, [refreshWallet, steps, refreshRoles, loadHome, loadRolePage]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Player';
  const pending = pendingRoles(roles);
  const balance = (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0);
  // Players, coaches and club admins get the playing parts; so does anyone with no role yet
  const plays = isPlayer || isCoach || isAdmin || active.length === 0;
  const pendingJuniors = juniors.filter((j) => j.link_status === 'pending' || !j.consent_given).length;
  const badges: Record<string, number> = { club: isAdmin ? approvalQueue.length : 0, children: pendingJuniors, rewards: rewardsReady };

  // The four pillars are in the footer, so Home's menu keeps only Rewards
  const groups = menuFor({
    roles: active,
    junior: home?.junior ?? false,
    switches: { store: STORE_ENABLED, deals: DEALS_ENABLED, cards: home?.cards.on ?? false },
  }).filter((g) => g.key === 'scores');

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
  const cards = home?.cards;

  const matchCard = (
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
  );
  // A player sees the next match straight after their figures
  const matchInDashboard = role === 'player';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.gold} />}
      >
        {/* ── Club and Scores ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {pages.length === 0 && <Text style={styles.greeting}>Good {getGreeting()}, {firstName}</Text>}
            {(home?.club ?? club?.name) && <Text style={[fonts.small, { marginTop: 2 }]}>{home?.club ?? club?.name}</Text>}
          </View>
          <Pressable onPress={() => router.push('/wallet')} style={styles.scoreBadge} accessibilityRole="button" accessibilityLabel={`${num(balance)} Scores. Open wallet`}>
            <Text style={styles.scoreBadgeText}>⭐ {num(balance)}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.profileBtn} accessibilityRole="button" accessibilityLabel="Your profile">
            <Ionicons name="person" size={17} color={colors.white} />
          </Pressable>
        </View>

        {/* ── The dashboard for the role this person is using ── */}
        {rolesLoading && !role ? (
          <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.xl }} />
        ) : role ? (
          <RoleDashboard
            role={role}
            firstName={firstName}
            data={rolePage.data}
            error={rolePage.error}
            onRetry={rolePage.load}
            onSwitch={chooseRole}
            nextSlot={matchInDashboard ? matchCard : undefined}
          />
        ) : null}

        {(active.includes('volunteer') || pending.length > 0) && (
          <View style={styles.roleBadgeRow}>
            {active.includes('volunteer') && (
              <Pressable onPress={() => router.push('/(tabs)/shifts')} accessibilityRole="button" accessibilityLabel="Volunteer. Open volunteer shifts"
                style={({ pressed }) => [styles.roleBadge, { backgroundColor: ROLE_CONFIG.volunteer.dimColor, borderWidth: 1, borderColor: `${ROLE_CONFIG.volunteer.color}55` }, pressed && { opacity: 0.7 }]}>
                <Text style={[styles.roleBadgeText, { color: ROLE_CONFIG.volunteer.color }]}>{ROLE_CONFIG.volunteer.icon} {ROLE_CONFIG.volunteer.label}  ›</Text>
              </Pressable>
            )}
            {pending.map((r) => (
              <View key={`p-${r}`} style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                <Text style={[styles.roleBadgeText, { color: colors.textMuted as string }]}>⏳ {ROLE_CONFIG[r].label} · waiting for your club</Text>
              </View>
            ))}
          </View>
        )}

        {(rolesError || homeError) && (
          <View style={styles.notice}>
            <Text style={fonts.small}>We couldn&apos;t load everything, so some parts may be missing. Pull down to try again.</Text>
          </View>
        )}

        {/* ── Next match: inside the player dashboard, otherwise here ── */}
        {!matchInDashboard && matchCard}

        {/* ── A card waiting to be scratched ── */}
        {cards?.on && cards.waiting > 0 && (
          <Pressable onPress={() => router.push('/scratch-cards')} accessibilityRole="button" style={({ pressed }) => [styles.prompt, pressed && { opacity: 0.75 }]}>
            <Text style={{ fontSize: 20 }}>🎟️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.promptTitle}>{cards.waiting} scratch {cards.waiting === 1 ? 'card' : 'cards'} to open</Text>
              <Text style={fonts.small}>Tap to scratch</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
          </Pressable>
        )}

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
  greeting: { fontFamily: display.heavy, fontSize: 18, color: colors.white, letterSpacing: -0.3 },
  profileBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  scoreBadge: {
    backgroundColor: colors.goldDim as string, borderWidth: 1, borderColor: colors.goldBorder as string,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
  },
  scoreBadgeText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  roleBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(239,200,74,0.35)', padding: spacing.md },
  promptTitle: { fontSize: 15, fontWeight: '700', color: colors.gold },
  notice: { backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border as string, padding: spacing.md },

  hero: { backgroundColor: '#1D4ED8', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(96,165,250,0.45)', padding: spacing.xl },
  heroEyebrow: { color: '#BFDBFE', fontSize: 13, fontWeight: '600' },
  heroTitle: { color: colors.white, fontFamily: display.heavy, fontSize: 20, letterSpacing: -0.5, marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 6 },
  heroButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  heroBtn: { borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 18 },
  heroBtnGhost: { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroBtnText: { fontSize: 14, fontWeight: '700' },


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
