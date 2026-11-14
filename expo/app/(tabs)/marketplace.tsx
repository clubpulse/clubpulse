import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RewardListItem } from '../../components/RewardListItem';
import { useScoresWallet } from '../../hooks/useScoresWallet';
import { api, ApiError, type Reward } from '../../lib/api';
import { colors, fonts, spacing } from '../../constants/theme';

export default function MarketplaceScreen() {
  const { total, refresh: refreshWallet } = useScoresWallet();
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { rewards: list } = await api<{ rewards: Reward[] }>('/api/marketplace/rewards');
      setRewards(list);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load rewards');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function redeem(reward: Reward) {
    try {
      await api('/api/marketplace/redeem', { method: 'POST', body: { rewardId: reward.id } });
      Alert.alert('Redeemed!', `You've redeemed ${reward.title}. We'll be in touch with details.`);
      await Promise.all([refreshWallet(), load()]);
    } catch (e) {
      Alert.alert('Could not redeem', e instanceof ApiError ? e.message : 'Something went wrong');
    }
  }

  function confirmRedeem(reward: Reward) {
    if (total < reward.creds_cost) {
      Alert.alert('Not enough Scores', `You need ${(reward.creds_cost - total).toLocaleString('en-GB')} more Scores for this.`);
      return;
    }
    Alert.alert('Redeem reward', `Spend ${reward.creds_cost.toLocaleString('en-GB')} Scores on ${reward.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', onPress: () => redeem(reward) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={rewards ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await Promise.all([load(), refreshWallet()]); setRefreshing(false); }}
            tintColor={colors.gold}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={fonts.heading}>Marketplace</Text>
            <Text style={fonts.small}>You have {total.toLocaleString('en-GB')} Scores</Text>
          </View>
        }
        ListEmptyComponent={
          error ? <Text style={{ color: colors.danger }}>{error}</Text>
          : rewards === null ? <ActivityIndicator color={colors.gold} />
          : <Text style={fonts.small}>No rewards yet. Check back soon.</Text>
        }
        renderItem={({ item }) => <RewardListItem reward={item} balance={total} onPress={() => confirmRedeem(item)} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.md },
});
