import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StepsCard } from '../../components/StepsCard';
import { WalletCard } from '../../components/WalletCard';
import { StreakCard } from '../../components/StreakCard';
import { SportingSoulCard } from '../../components/SportingSoulCard';
import { Card } from '../../components/Card';
import { useScoresWallet } from '../../hooks/useScoresWallet';
import { useSteps } from '../../hooks/useSteps';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function HomeScreen() {
  const { wallet, loading, refresh: refreshWallet } = useScoresWallet();
  const steps = useSteps();
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const roles: string[] = (user?.user_metadata?.roles as string[]) ?? ['player'];
  const isAdmin = roles.includes('club_admin');
  const displayName = (user?.user_metadata?.full_name as string)?.split(' ')[0] ?? 'Player';

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
        {/* Header with profile & admin shortcuts */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={fonts.heading}>Good evening, {displayName}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {isAdmin && (
              <Pressable onPress={() => router.push('/admin')} style={styles.headerBtn}>
                <Ionicons name="shield-checkmark" size={20} color={colors.gold} />
              </Pressable>
            )}
            <Pressable onPress={() => router.push('/profile')} style={styles.headerBtn}>
              <Ionicons name="person-circle-outline" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Quick stats */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[fonts.small, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Scores</Text>
            <Text style={[fonts.big, { fontSize: 24, color: colors.gold }]}>
              {wallet ? wallet.flexi_balance.toLocaleString() : '—'}
            </Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[fonts.small, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Fantasy rank</Text>
            <Text style={[fonts.big, { fontSize: 24 }]}>#3</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[fonts.small, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Level</Text>
            <Text style={[fonts.big, { fontSize: 24, color: '#A78BFA' }]}>4</Text>
          </Card>
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

        {/* Next match */}
        <Card style={{ borderColor: 'rgba(52,211,153,0.2)', borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={fonts.title}>Next match</Text>
              <Text style={fonts.regular}>vs Maidenhead CC</Text>
              <Text style={fonts.small}>Sat 16 Nov · Home</Text>
            </View>
            <View style={styles.livePill}>
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>3 DAYS</Text>
            </View>
          </View>
        </Card>

        <SportingSoulCard />

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable onPress={() => router.push('/scores')} style={[styles.quickAction, { flex: 1 }]}>
            <Text style={{ fontSize: 20 }}>⭐</Text>
            <Text style={styles.qaText}>Earn Scores</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/play')} style={[styles.quickAction, { flex: 1 }]}>
            <Text style={{ fontSize: 20 }}>🎮</Text>
            <Text style={styles.qaText}>Play games</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/match')} style={[styles.quickAction, { flex: 1 }]}>
            <Text style={{ fontSize: 20 }}>🏏</Text>
            <Text style={styles.qaText}>Match day</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.navyBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  livePill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
    backgroundColor: 'rgba(52,211,153,0.12)',
  },
  quickAction: {
    backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.navyBorder,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 6,
  },
  qaText: { fontSize: 12, fontWeight: '600', color: colors.text },
});
