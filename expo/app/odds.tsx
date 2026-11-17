import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Card } from '../components/Card';
import { type CardTier, IAP_PRODUCTS, formatOdds, getCardOdds } from '../lib/iap';
import { colors, fonts, radius, spacing } from '../constants/theme';

const CARDS: { tier: CardTier; title: string; price: number; how: string }[] = [
  {
    tier: 'net_session',
    title: 'Net Session',
    price: IAP_PRODUCTS.net_session_card.priceGBP,
    how: 'Three panels. Your total runs decide the prize tier.',
  },
  {
    tier: 'match_day',
    title: 'Match Day',
    price: IAP_PRODUCTS.match_day_card.priceGBP,
    how: 'Six balls. A wicket ends the innings early. Your total runs decide the prize tier.',
  },
];

export default function OddsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Prize odds',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.small}>
          Every card wins one prize. The outcome is random and is not affected by skill, by how you scratch,
          or by earlier cards. These are the chances for a single card.
        </Text>
        {CARDS.map((card) => (
          <OddsTable key={card.tier} {...card} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function OddsTable({ tier, title, price, how }: (typeof CARDS)[number]) {
  const odds = useMemo(() => getCardOdds(tier), [tier]);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.tableHeader}>
        <Text style={fonts.title}>{title}</Text>
        <Text style={styles.price}>£{price.toFixed(2)}</Text>
      </View>
      <Text style={fonts.small}>{how}</Text>
      {odds.map((t) => (
        <Card key={t.name} style={styles.tierCard}>
          <View style={styles.row}>
            <Text style={[fonts.regular, styles.tierLabel]}>{t.label}</Text>
            <Text style={styles.tierOdds}>{formatOdds(t.probability)}</Text>
          </View>
          {t.prizes.map((p) => (
            <View key={p.label} style={styles.row}>
              <Text style={[fonts.small, { flex: 1 }]}>{p.label}</Text>
              <Text style={fonts.small}>{formatOdds(p.probability)}</Text>
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: colors.brandSky, fontWeight: '700', fontSize: 14 },
  tierCard: { padding: spacing.md, gap: spacing.xs, borderRadius: radius.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  tierLabel: { flex: 1, fontWeight: '600', color: colors.white },
  tierOdds: { color: colors.gold, fontWeight: '700', fontSize: 15 },
});
