import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsCard } from '../../components/StepsCard';
import { WalletCard } from '../../components/WalletCard';
import { StreakCard } from '../../components/StreakCard';
import { SportingSoulCard } from '../../components/SportingSoulCard';
import { useScoresWallet } from '../../hooks/useScoresWallet';
import { useSteps } from '../../hooks/useSteps';
import { colors, fonts, spacing } from '../../constants/theme';

export default function HomeScreen() {
  const { wallet, loading, refresh: refreshWallet } = useScoresWallet();
  const steps = useSteps();
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshWallet(), steps.refresh()]);
    // A steps sync can award Scores, so read the wallet again afterwards
    await refreshWallet();
    setRefreshing(false);
  }, [refreshWallet, steps]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.gold} />}
      >
        <Text style={fonts.heading}>Home</Text>
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
        <SportingSoulCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
});
