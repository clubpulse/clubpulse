import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Card } from '../components/Card';
import {
  AWIN_CATEGORY_CONFIG,
  type AwinCategory,
  IAP_PRODUCTS_049,
  IAP_PRODUCTS_099,
  type IAPProduct,
} from '../lib/iap';
import { colors, fonts, radius, spacing } from '../constants/theme';

export default function StoreScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Store',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero — Scratch Cards */}
        <View style={{ gap: spacing.sm }}>
          <Text style={fonts.heading}>Scratch & Win 🏏</Text>
          <Text style={fonts.small}>
            Every card wins. Prizes include Scores, streak shields, exclusive badges, and brand discounts
            from top sports, grocery, and electronics brands.
          </Text>
        </View>

        {/* Scratch card CTAs */}
        <View style={styles.scratchRow}>
          <ScratchCardCTA
            title="Net Session"
            subtitle="3 panels"
            price="£0.49"
            emoji="🏏"
            topPrize="Up to 150 Scores"
            highlight={false}
            onPress={() => router.push('/scratch-card/net_session')}
          />
          <ScratchCardCTA
            title="Match Day"
            subtitle="6 balls · wicket ends innings"
            price="£0.99"
            emoji="🏟️"
            topPrize="Up to 500 Scores + frame"
            highlight
            onPress={() => router.push('/scratch-card/match_day')}
          />
        </View>

        {/* Awin discount categories preview */}
        <View style={{ gap: spacing.md }}>
          <Text style={fonts.title}>Win discounts from these categories</Text>
          <View style={styles.categoryGrid}>
            {(Object.entries(AWIN_CATEGORY_CONFIG) as [AwinCategory, typeof AWIN_CATEGORY_CONFIG[AwinCategory]][]).map(
              ([key, cfg]) => (
                <View key={key} style={styles.categoryChip}>
                  <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                  <Text style={[styles.categoryChipText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              ),
            )}
          </View>
          <Text style={[fonts.small, { textAlign: 'center' }]}>
            New Balance · Castore · Gray-Nicolls · MyProtein · Garmin · Currys · and more
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Other IAPs — £0.49 tier */}
        <View style={{ gap: spacing.md }}>
          <Text style={fonts.title}>£0.49</Text>
          {IAP_PRODUCTS_049.filter((p) => !p.id.includes('card')).map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </View>

        {/* Other IAPs — £0.99 tier */}
        <View style={{ gap: spacing.md }}>
          <Text style={fonts.title}>£0.99</Text>
          {IAP_PRODUCTS_099.filter((p) => !p.id.includes('card')).map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Scratch Card CTA ── */

function ScratchCardCTA({
  title,
  subtitle,
  price,
  emoji,
  topPrize,
  highlight,
  onPress,
}: {
  title: string;
  subtitle: string;
  price: string;
  emoji: string;
  topPrize: string;
  highlight: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.scratchCard,
        highlight && styles.scratchCardHighlight,
        pressed && { opacity: 0.8 },
      ]}
    >
      {highlight && <View style={styles.popularBadge}><Text style={styles.popularText}>POPULAR</Text></View>}
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <Text style={[fonts.title, { textAlign: 'center', fontSize: 16 }]}>{title}</Text>
      <Text style={[fonts.small, { textAlign: 'center', fontSize: 11 }]}>{subtitle}</Text>
      <View style={styles.topPrizeBadge}>
        <Text style={styles.topPrizeText}>🏆 {topPrize}</Text>
      </View>
      <View style={styles.priceBtn}>
        <Text style={styles.priceBtnText}>{price}</Text>
      </View>
    </Pressable>
  );
}

/* ── Product Row ── */

function ProductRow({ product }: { product: IAPProduct }) {
  return (
    <Card style={styles.productRow}>
      <View style={styles.productInfo}>
        <Text style={{ fontSize: 24 }}>{product.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={fonts.regular}>{product.name}</Text>
          <Text style={[fonts.small, { fontSize: 12 }]}>{product.description}</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.buyBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.buyBtnText}>£{product.priceGBP.toFixed(2)}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl },

  scratchRow: { flexDirection: 'row', gap: spacing.md },
  scratchCard: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  scratchCardHighlight: {
    borderColor: 'rgba(239,200,74,0.4)',
    backgroundColor: 'rgba(239,200,74,0.04)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  popularText: { color: colors.background, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  topPrizeBadge: {
    backgroundColor: 'rgba(239,200,74,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  topPrizeText: { color: colors.gold, fontSize: 10, fontWeight: '600' },
  priceBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  priceBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border as string,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600' },

  divider: { height: 1, backgroundColor: colors.border as string },

  productRow: { padding: spacing.sm },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  buyBtn: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border as string,
  },
  buyBtnText: { color: colors.brandSky, fontWeight: '700', fontSize: 14 },
});
