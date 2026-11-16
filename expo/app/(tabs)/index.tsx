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
import { colors, fonts, spacing, radius } from '../../constants/theme';

// ── Quick link definitions ──────────────────────────────────────────────────
type QuickLink = { label: string; icon: string; route: string; bg: string; fg: string };

const PLAYER_LINKS: QuickLink[] = [
  { label: 'Wallet',      icon: '⭐', route: '/wallet',       bg: colors.goldDim,         fg: colors.gold },
  { label: 'Marketplace',  icon: '🎁', route: '/marketplace',  bg: colors.brandPrimaryDim, fg: colors.brandSky },
  { label: 'Coach AI',     icon: '💬', route: '/companion',    bg: colors.successDim,      fg: colors.success },
  { label: 'My Story',     icon: '📖', route: '/sporting-soul', bg: colors.orangeDim,       fg: colors.orange },
];

// ── Main screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useScoresWallet();
  const steps = useSteps();
  const router = useRouter();
  const { roles, active, isAdmin, isCoach, isParent, isVolunteer, club, juniors, approvalQueue, refresh: refreshRoles } = useRoles();
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Player';
  const pending = pendingRoles(roles);

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

        {/* ── ADMIN SECTION ─────────────────────────────────────── */}
        {isAdmin && club && (
          <>
            <SectionLabel label="Admin" />
            <Pressable style={styles.card} onPress={() => router.push('/(tabs)/club')}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: ROLE_CONFIG.club_admin.dimColor }]}>
                  <Ionicons name="shield-checkmark" size={18} color={ROLE_CONFIG.club_admin.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fonts.title}>Club overview</Text>
                  <Text style={fonts.small}>{club.member_count} members · {tierLabel(club.subscription_tier)}</Text>
                </View>
                {approvalQueue.length > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifText}>{approvalQueue.length}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
              </View>
            </Pressable>
            {approvalQueue.length > 0 && (
              <Pressable style={styles.card} onPress={() => router.push('/(tabs)/club')}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.orangeDim }]}>
                    <Ionicons name="time" size={18} color={colors.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.title}>Pending approvals</Text>
                    <Text style={fonts.small}>{approvalQueue.length} request{approvalQueue.length !== 1 ? 's' : ''} waiting</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                </View>
              </Pressable>
            )}
            <View style={styles.quickRow}>
              <QuickAction icon="cash" label="Buy Scores" color={colors.gold} bg={colors.goldDim} />
              <QuickAction icon="add-circle" label="Post shift" color={colors.brandSky} bg={colors.brandPrimaryDim} />
            </View>
          </>
        )}

        {/* ── COACH SECTION ─────────────────────────────────────── */}
        {isCoach && (
          <>
            <SectionLabel label="Coaching" />
            <Pressable style={styles.card} onPress={() => router.push('/(tabs)/coaches')}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: ROLE_CONFIG.coach.dimColor }]}>
                  <Ionicons name="trophy" size={18} color={ROLE_CONFIG.coach.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fonts.title}>My sessions</Text>
                  <Text style={fonts.small}>View bookings & availability</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
              </View>
            </Pressable>
          </>
        )}

        {/* ── PARENT SECTION ────────────────────────────────────── */}
        {isParent && (
          <>
            <SectionLabel label="Parenting" />
            {juniors.length === 0 ? (
              <Pressable style={styles.card} onPress={() => router.push('/safeguarding')}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: ROLE_CONFIG.parent.dimColor }]}>
                    <Ionicons name="people" size={18} color={ROLE_CONFIG.parent.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.title}>Link your child</Text>
                    <Text style={fonts.small}>Request to link a junior for safeguarding</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                </View>
              </Pressable>
            ) : (
              juniors.map((j) => (
                <Pressable
                  key={j.id}
                  style={styles.card}
                  onPress={() => {
                    if (j.link_status === 'approved') {
                      router.push({ pathname: '/junior/[id]', params: { id: j.junior_id } });
                    }
                  }}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: ROLE_CONFIG.parent.dimColor }]}>
                      <Ionicons name="shield-checkmark" size={18} color={ROLE_CONFIG.parent.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={fonts.title}>{j.full_name}</Text>
                      <Text style={fonts.small}>
                        {j.age_group ? `${j.age_group} · ` : ''}
                        Consent: {j.consent_given ? 'active' : 'pending'}
                      </Text>
                    </View>
                    {j.link_status === 'pending' ? (
                      <View style={[styles.statusPill, { backgroundColor: colors.orangeDim }]}>
                        <Text style={[styles.statusPillText, { color: colors.orange }]}>Pending</Text>
                      </View>
                    ) : j.link_status === 'approved' ? (
                      <>
                        <View style={[styles.statusPill, { backgroundColor: colors.successDim }]}>
                          <Text style={[styles.statusPillText, { color: colors.success }]}>Linked</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                      </>
                    ) : null}
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}

        {/* ── VOLUNTEER SECTION ─────────────────────────────────── */}
        {isVolunteer && (
          <>
            <SectionLabel label="Volunteering" />
            <Pressable style={styles.card} onPress={() => router.push('/(tabs)/shifts')}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: ROLE_CONFIG.volunteer.dimColor }]}>
                  <Ionicons name="heart" size={18} color={ROLE_CONFIG.volunteer.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fonts.title}>Volunteer shifts</Text>
                  <Text style={fonts.small}>Browse & sign up for shifts</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
              </View>
            </Pressable>
          </>
        )}

        {/* ── PLAYER SECTION (always shown — every user is a player) ── */}
        <SectionLabel label="Player" />
        <StepsCard
          steps={steps.steps}
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
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper components ────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
}

function QuickAction({ icon, label, color, bg }: { icon: string; label: string; color: string; bg: string }) {
  return (
    <Pressable style={[styles.quickCard, { backgroundColor: bg as string }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.quickCardText, { color }]}>{label}</Text>
    </Pressable>
  );
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
