import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../constants/theme';
import type { Reward } from '../lib/api';

export function RewardListItem({ reward, balance, onPress }: { reward: Reward; balance: number; onPress: () => void }) {
  const outOfStock = reward.stock_count !== null && reward.stock_count <= 0;
  const affordable = balance >= reward.creds_cost && !outOfStock;

  return (
    <Pressable onPress={onPress} disabled={outOfStock} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.icon}><Text style={{ fontSize: 22 }}>🎁</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={fonts.title} numberOfLines={1}>{reward.title}</Text>
        {!!reward.description && <Text style={fonts.small} numberOfLines={2}>{reward.description}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.cost, !affordable && { color: colors.textMuted }]}>{reward.creds_cost.toLocaleString('en-GB')}</Text>
        <Text style={fonts.small}>{outOfStock ? 'Out of stock' : affordable ? 'Redeem' : 'Scores'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
    backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.navyBorder,
  },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  cost: { color: colors.gold, fontSize: 18, fontWeight: '700' },
});
