import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, Stack } from 'expo-router';
import { DEALS_ENABLED } from '../constants/features';
import { Card } from '../components/Card';
import { useDeals, type AwinCategory, type AwinDeal } from '../hooks/useDeals';
import { colors, fonts, radius, spacing } from '../constants/theme';

const CATEGORY_FILTERS: { key: AwinCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all',              label: 'All',              icon: '🔥' },
  { key: 'sports_apparel',   label: 'Apparel',          icon: '👕' },
  { key: 'sports_equipment', label: 'Equipment',        icon: '🏏' },
  { key: 'groceries',        label: 'Groceries',        icon: '🛒' },
  { key: 'electronics',      label: 'Electronics',      icon: '📱' },
  { key: 'general_value',    label: 'Value',            icon: '🏷️' },
];

export default function DealsScreen() {
  // Deep links and stale navigation can still reach this route while the flag is off
  if (!DEALS_ENABLED) return <Redirect href="/store" />;
  return <DealsList />;
}

function DealsList() {
  const [activeFilter, setActiveFilter] = useState<AwinCategory | 'all'>('all');
  const category = activeFilter === 'all' ? undefined : activeFilter;
  const { deals, loading, error, refresh } = useDeals(category);

  const openDeal = useCallback(async (deal: AwinDeal) => {
    if (deal.deepLink) {
      await Linking.openURL(deal.deepLink);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Deals and discounts',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
        }}
      />

      {/* Category filter chips — scroll sideways, six don't fit a phone's width */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORY_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[
              styles.filterChip,
              activeFilter === f.key && styles.filterChipActive,
            ]}
          >
            <Text style={{ fontSize: 14 }}>{f.icon}</Text>
            <Text
              style={[
                styles.filterText,
                activeFilter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={fonts.regular}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <DealCard deal={item} onPress={() => openDeal(item)} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={fonts.small}>No deals in this category right now.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function DealCard({ deal, onPress }: { deal: AwinDeal; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.dealCard}>
        <View style={styles.dealHeader}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{deal.discountPct}% OFF</Text>
          </View>
          <Text style={[fonts.small, { flex: 1 }]}>{deal.merchantName}</Text>
        </View>
        <Text style={[fonts.regular, { fontWeight: '600' }]}>{deal.title}</Text>
        <View style={styles.dealFooter}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>CODE: {deal.code}</Text>
          </View>
          <Text style={[fonts.small, { color: colors.brandSky }]}>Shop now →</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filterScroll: { flexGrow: 0 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border as string,
  },
  filterChipActive: {
    backgroundColor: 'rgba(37,99,235,0.15)',
    borderColor: colors.brandPrimary,
  },
  filterText: { fontSize: 12, color: colors.textMuted as string, fontWeight: '500' },
  filterTextActive: { color: colors.brandSky },

  list: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  dealCard: { padding: spacing.md, gap: spacing.sm },
  dealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  discountBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: { color: '#22C55E', fontSize: 11, fontWeight: '800' },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border as string,
  },
  codeText: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryText: { color: colors.white, fontWeight: '600' },
});
