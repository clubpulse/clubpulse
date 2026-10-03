import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletCard } from '../../components/WalletCard';
import { useCredsWallet } from '../../hooks/useCredsWallet';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, spacing } from '../../constants/theme';

type HistoryItem = { id: string; title: string; amount: number; at: string };

export default function WalletScreen() {
  const { user } = useAuth();
  const { wallet, loading, refresh } = useCredsWallet();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    // RLS limits both tables to the signed-in user's own rows
    const [perfs, steps] = await Promise.all([
      supabase
        .from('performances')
        .select('id, category, creds_earned, performed_at, sport:sport_configs ( display_name )')
        .eq('user_id', user.id).gt('creds_earned', 0).order('performed_at', { ascending: false }).limit(30),
      supabase
        .from('steps_log')
        .select('id, step_count, creds_earned, synced_at')
        .eq('user_id', user.id).gt('creds_earned', 0).order('synced_at', { ascending: false }).limit(30),
    ]);

    const items: HistoryItem[] = [];
    for (const p of perfs.data ?? []) {
      const sport = Array.isArray(p.sport) ? p.sport[0] : p.sport;
      items.push({ id: `p-${p.id}`, title: `${sport?.display_name ?? 'Sport'} ${p.category}`, amount: p.creds_earned, at: p.performed_at });
    }
    for (const s of steps.data ?? []) {
      items.push({ id: `s-${s.id}`, title: `${Number(s.step_count).toLocaleString('en-GB')} steps`, amount: s.creds_earned, at: s.synced_at });
    }
    setHistory(items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40));
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadHistory()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
            <Text style={fonts.heading}>Wallet</Text>
            <WalletCard wallet={wallet} loading={loading} />
            <Text style={[fonts.title, { marginTop: spacing.sm }]}>History</Text>
          </View>
        }
        ListEmptyComponent={<Text style={fonts.small}>No Creds earned yet. Sync your steps to get started.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={fonts.regular} numberOfLines={1}>{item.title}</Text>
              <Text style={fonts.small}>{new Date(item.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
            </View>
            <Text style={{ color: colors.success, fontWeight: '700' }}>+{item.amount}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.navyLight, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder,
  },
});
