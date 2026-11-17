import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StepsCard } from '../../components/StepsCard';
import { WalletCard } from '../../components/WalletCard';
import { StreakCard } from '../../components/StreakCard';
import { useScoresWallet } from '../../hooks/useScoresWallet';
import { useSteps } from '../../hooks/useSteps';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { ROLE_CONFIG, pendingRoles } from '../../lib/roles';
import type { UserRole } from '../../lib/roles';
import { UpsellBanner } from '../../components/UpsellBanner';
import { STORE_ENABLED } from '../../constants/features';
import { colors, fonts, spacing, radius } from '../../constants/theme';

// ── Quick link definitions ──────────────────────────────────────────────────
type QuickLink = { label: string; icon: string; route: string; bg: string; fg: string };

const ALL_PLAYER_LINKS: QuickLink[] = [
  { label: 'Wallet',      icon: '⭐', route: '/wallet',       bg: colors.goldDim,         fg: colors.gold },
  { label: 'Marketplace',  icon: '🎁', route: '/marketplace',  bg: colors.brandPrimaryDim, fg: colors.brandSky },
  { label: 'Store',        icon: '🏏', route: '/store',        bg: 'rgba(239,200,74,0.12)', fg: colors.gold },
  { label: 'Coach AI',     icon: '💬', route: '/companion',    bg: colors.successDim,      fg: colors.success },
];

type RoleRow = {
  role: UserRole;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  count: number;
  onPress: () => void;
};

const PLAYER_LINKS = ALL_PLAYER_LINKS.filter((l) => STORE_ENABLED || l.route !== '/store');

// ── Main screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useScoresWallet();
  const steps = useSteps();
  const router = useRouter();
  const { roles, active, isAdmin, isCoach, isParent, isVolunteer, club, juniors, approvalQueue, error: rolesError, refresh: refreshRoles } = useRoles();
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Player';
  const pending = pendingRoles(roles);

  // One row per role the person holds. count is the number of things waiting on them.
  const pendingJuniors = juniors.filter((j) => j.link_status === 'pending' || !j.consent_given).length;
  const approvedJuniors = juniors.filter((j) => j.link_status === 'approved');
  const roleRows: RoleRow[] = [];
  if (isAdmin && club) {
    roleRows.push({
      role: 'club_admin',
      icon: 'shield-checkmark',
      title: 'Club admin',
      subtitle: `${club.member_count} member${club.member_count === 1 ? '' : 's'} · ${tierLabel(club.subscription_tier)}`,
      count: approvalQueue.length,
      onPress: () => router.push('/(tabs)/club'),
    });
  }
  if (isCoach) {
    roleRows.push({
      role: 'coach',
      icon: 'trophy',
      title: 'Coaching',
      subtitle: 'Bookings and availability',
      count: 0,
      onPress: () => router.push('/(tabs)/coaches'),
    });
  }
  if (isParent) {
    roleRows.push({
      role: 'parent',
      icon: 'people',
      title: 'My children',
      subtitle:
        juniors.length === 0
          ? 'Link your child'
          : `${juniors.length} linked${pendingJuniors > 0 ? ` · ${pendingJuniors} need attention` : ''}`,
      count: pendingJuniors,
      // Straight to the child when there is exactly one and nothing is outstanding
      onPress: () =>
        juniors.length === 1 && approvedJuniors.length === 1 && pendingJuniors === 0
          ? router.push({ pathname: '/junior/[id]', params: { id: approvedJuniors[0].junior_id } })
          : router.push('/safeguarding'),
    });
  }
  if (isVolunteer) {
    roleRows.push({
      role: 'volunteer',
      icon: 'heart',
      title: 'Volunteering',
      subtitle: 'Browse and sign up for shifts',
      count: 0,
      onPress: () => router.push('/(tabs)/shifts'),
    });
  }

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshWallet(), steps.refresh(), refreshRoles()]);
    setRefreshing(false);
  }, [refreshWallet, steps, refreshRoles]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.gold} />}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={fonts.small}>Good {getGreeting()}</Text>
            <Text style={fonts.heading}>{firstName} 👋</Text>
            {club && <Text style={[fonts.small, { marginTop: 2 }]}>{club.name}</Text>}
          </View>
          <Pressable onPress={() => router.push('/wallet')} style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>
              ⭐ {((wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0)).toLocaleString('en-GB')}
            </Text>
          </Pressable>
        </View>

        {/* ── Role badges ───────────────────────────────────────── */}
        <View style={styles.roleBadgeRow}>
          {active.map((role) => (
            <View key={role} style={[styles.roleBadge, { backgroundColor: ROLE_CONFIG[role].dimColor }]}>
              <Text style={[styles.roleBadgeText, { color: ROLE_CONFIG[role].color }]}>
                {ROLE_CONFIG[role].icon} {ROLE_CONFIG[role].label}
              </Text>
            </View>
          ))}
          {pending.map((role) => (
            <View key={`p-${role}`} style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
              <Text style={[styles.roleBadgeText, { color: colors.textMuted as string }]}>
                ⏳ {ROLE_CONFIG[role].label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── PLAYER (first: this is what everyone opens the app for) ── */}
        <StepsCard
          steps={steps.steps}
          source={steps.source}
          status={steps.status}
          syncing={steps.syncing}
          result={steps.result}
          error={steps.error}
          onSync={refreshAll}
        />
        <WalletCard wallet={wallet} loading={walletLoading} />
        <StreakCard streakDay={steps.result?.streakDay ?? 0} onUsed={refreshWallet} />

        {/* Quick links */}
        <View style={styles.linkRow}>
          {PLAYER_LINKS.map((l) => (
            <Pressable
              key={l.route}
              onPress={() => router.push(l.route as any)}
              style={[styles.linkCard, { backgroundColor: l.bg }]}
            >
              <Text style={{ fontSize: 22 }}>{l.icon}</Text>
              <Text style={[styles.linkLabel, { color: l.fg }]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── ROLES: one row each, so Home stays short however many roles someone holds ── */}
        {(roleRows.length > 0 || rolesError) && <SectionLabel label="Your roles" />}
        {rolesError && (
          <View style={styles.card}>
            <Text style={fonts.small}>
              We couldn&apos;t load your club roles, so some sections may be missing. Pull down to try again.
            </Text>
          </View>
        )}
        {roleRows.map((row) => (
          <Pressable key={row.role} style={styles.card} onPress={row.onPress}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: ROLE_CONFIG[row.role].dimColor }]}>
                <Ionicons name={row.icon} size={18} color={ROLE_CONFIG[row.role].color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fonts.title}>{row.title}</Text>
                <Text style={fonts.small}>{row.subtitle}</Text>
              </View>
              {row.count > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifText}>{row.count}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
            </View>
          </Pressable>
        ))}

        {/* ── SCRATCH CARD UPSELL ── */}
        <UpsellBanner trigger="social_proof" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper components ────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function tierLabel(tier: string | null): string {
  if (!tier) return 'No plan';
  return tier.charAt(0).toUpperCase() + tier.slice(1) + ' plan';
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreBadge: {
    backgroundColor: colors.goldDim as string,
    borderWidth: 1,
    borderColor: colors.goldBorder as string,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  scoreBadgeText: { color: colors.gold, fontWeight: '700', fontSize: 13 },

  // Role badges
  roleBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(232,237,245,0.4)',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  // Cards
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status pills
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  // Notification badge
  notifBadge: {
    backgroundColor: colors.danger,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Quick actions (admin)
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
  },
  quickCardText: { fontSize: 13, fontWeight: '600' },

  // Player quick links
  linkRow: { flexDirection: 'row', gap: spacing.sm },
  linkCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  linkLabel: { fontSize: 11, fontWeight: '600' },
});
