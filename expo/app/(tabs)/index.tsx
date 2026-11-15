import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StepsCard } from '../../components/StepsCard';
import { WalletCard } from '../../components/WalletCard';
import { StreakCard } from '../../components/StreakCard';
import { useScoresWallet } from '../../hooks/useScoresWallet';
import { useSteps } from '../../hooks/useSteps';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, spacing, radius } from '../../constants/theme';

type QuickLink = { label: string; icon: string; route: string; bg: string; fg: string };

const LINKS: QuickLink[] = [
  { label: 'Wallet',      icon: '⭐', route: '/wallet',      bg: colors.goldDim,           fg: colors.gold },
  { label: 'Marketplace',  icon: '🎁', route: '/marketplace',  bg: colors.brandPrimaryDim,   fg: colors.brandSky },
  { label: 'Coach AI',     icon: '💬', route: '/companion',    bg: colors.successDim,        fg: colors.success },
  { label: 'My Story',     icon: '📖', route: '/sporting-soul', bg: colors.orangeDim,         fg: colors.orange },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { wallet, loading, refresh: refreshWallet } = useScoresWallet();
  const steps = useSteps();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Player';

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshWallet(), steps.refresh()]);
    await refreshWallet();
    setRefreshing(false);
  }, [refreshWallet, steps]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={fonts.small}>Good {getGreeting()}</Text>
            <Text style={fonts.heading}>{firstName} 👋</Text>
          </View>
          <Pressable
            onPress={() => router.push('/wallet')}
            style={styles.scoreBadge}
          >
            <Text style={styles.scoreBadgeText}>⭐ {((wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0)).toLocaleString('en-GB')}</Text>
          </Pressable>
        </View>

        {/* Quick links */}
        <View style={styles.linkRow}>
          {LINKS.map((l) => (
            <Pressable key={l.route} onPress={() => router.push(l.route as any)} style={[styles.linkCard, { backgroundColor: l.bg }]}>
              <Text style={{ fontSize: 22 }}>{l.icon}</Text>
              <Text style={[styles.linkLabel, { color: l.fg }]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>

        <StepsCard
          steps={steps.steps}
          status={steps.status}
          syncing={steps.syncing}
          result={steps.result}
          error={steps.error}
          onSync={refreshAll}
        />
        <WalletCard wallet={wallet} loading={loading} />
        <StreakCard streakDay={steps.result?.streakDay ?? 0} onUsed={refreshWallet} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreBadge: {
    backgroundColor: colors.goldDim,
    borderWidth: 1,
    borderColor: colors.goldBorder as string,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  scoreBadgeText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
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
