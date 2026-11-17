import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { Card } from '../../components/Card';
import {
  AWIN_CATEGORY_CONFIG,
  BALL_DISPLAY,
  type CardTier,
  type ScratchCardResult,
  type ScratchPanel,
  generateMatchDayCard,
  generateNetSessionCard,
  getUpsell,
} from '../../lib/iap';
import { STORE_ENABLED } from '../../constants/features';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function ScratchCardScreen() {
  // Reachable by deep link even with the Store switched off
  if (!STORE_ENABLED) return <Redirect href="/" />;
  return <ScratchCardScreenContent />;
}

function ScratchCardScreenContent() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const cardTier: CardTier = type === 'match_day' ? 'match_day' : 'net_session';

  const result = useMemo<ScratchCardResult>(
    () => (cardTier === 'match_day' ? generateMatchDayCard() : generateNetSessionCard()),
    [cardTier],
  );

  const [revealedPanels, setRevealedPanels] = useState<boolean[]>(
    result.panels.map(() => false),
  );
  const [showPrize, setShowPrize] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const prizeScale = useRef(new Animated.Value(0)).current;
  const allRevealed = revealedPanels.every(Boolean);
  const inningsOver = useRef(false);

  const revealPanel = useCallback(
    (index: number) => {
      if (revealedPanels[index] || inningsOver.current) return;

      const panel = result.panels[index];

      // For Match Day, enforce left-to-right order
      if (cardTier === 'match_day') {
        const nextUnrevealed = revealedPanels.findIndex((r) => !r);
        if (index !== nextUnrevealed) return;
      }

      const next = [...revealedPanels];
      next[index] = true;

      // If wicket, reveal remaining panels as greyed out
      if (panel.outcome === 'wicket') {
        inningsOver.current = true;
        for (let i = index + 1; i < next.length; i++) next[i] = true;
      }

      setRevealedPanels(next);

      // Check if all now revealed
      if (next.every(Boolean)) {
        setTimeout(() => {
          setShowPrize(true);
          Animated.spring(prizeScale, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }).start();

          // Show upsell after prize if this was a net session card
          if (cardTier === 'net_session') {
            setTimeout(() => setShowUpsell(true), 2000);
          }
        }, 600);
      }
    },
    [revealedPanels, result, cardTier, prizeScale],
  );

  const runsSoFar = result.panels.reduce(
    (sum, p, i) => sum + (revealedPanels[i] && p.outcome !== 'wicket' ? p.runs : 0),
    0,
  );

  const upsell = cardTier === 'net_session' ? getUpsell('post_scratch') : null;
  const chosenPrize = chosen === null ? null : result.choices[chosen];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: cardTier === 'match_day' ? '🏟️ Match Day Card' : '🏏 Net Session Card',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <Text style={[fonts.heading, { textAlign: 'center' }]}>
            {cardTier === 'match_day' ? '🏟️ Match Day' : '🏏 Net Session'}
          </Text>
          <Text style={[fonts.small, { textAlign: 'center' }]}>
            {cardTier === 'match_day'
              ? 'Face a full over — 6 balls! A wicket ends your innings.'
              : 'Scratch 3 panels to reveal your prize!'}
          </Text>
        </View>

        {/* Score display */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>RUNS</Text>
          <Text style={styles.scoreValue}>{runsSoFar}</Text>
        </View>

        {/* Panels grid */}
        <View style={styles.panelsContainer}>
          {result.panels.map((panel, idx) => (
            <PanelCard
              key={idx}
              index={idx}
              panel={panel}
              revealed={revealedPanels[idx]}
              isWicketed={inningsOver.current && idx > (result.wicketBall ?? 99)}
              onReveal={() => revealPanel(idx)}
              cardTier={cardTier}
              isNextToReveal={
                cardTier === 'match_day'
                  ? idx === revealedPanels.findIndex((r) => !r)
                  : !revealedPanels[idx]
              }
            />
          ))}
        </View>

        {/* Prize reveal */}
        {showPrize && (
          <Animated.View style={[styles.prizeContainer, { transform: [{ scale: prizeScale }] }]}>
            <Card style={styles.prizeCard}>
              <Text style={{ fontSize: 48, textAlign: 'center' }}>{result.prizeTier.emoji}</Text>
              <Text style={[fonts.heading, { textAlign: 'center', fontSize: 22, marginTop: spacing.sm }]}>
                {result.prizeTier.label}
              </Text>
              <Text style={[fonts.title, { textAlign: 'center', color: colors.gold, marginTop: spacing.xs }]}>
                {result.totalRuns} runs
              </Text>

              {/* Prize details */}
              <View style={styles.prizeDivider} />

              <Text style={[fonts.small, { textAlign: 'center', marginBottom: spacing.sm }]}>
                {chosenPrize ? 'YOUR DISCOUNT' : `CHOOSE 1 OF ${result.choices.length}`}
              </Text>

              {/* Discount choices: the player keeps one */}
              {!chosenPrize && (
                <View style={{ gap: spacing.sm }}>
                  {result.choices.map((choice, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => setChosen(idx)}
                      style={({ pressed }) => [styles.choiceRow, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={{ fontSize: 20 }}>
                        {choice.awinDeal ? AWIN_CATEGORY_CONFIG[choice.awinDeal.category].icon : '🎁'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={fonts.title}>{choice.label}</Text>
                        <Text style={fonts.small}>
                          {choice.awinDeal ? choice.awinDeal.description : 'Use it in the Marketplace'}
                        </Text>
                      </View>
                      <Text style={styles.choicePick}>Pick</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {chosenPrize && (
                <Text style={[fonts.title, { textAlign: 'center', fontSize: 18 }]}>{chosenPrize.label}</Text>
              )}

              {/* Awin deal details */}
              {chosenPrize?.awinDeal && (
                <View style={styles.awinDealCard}>
                  <View style={styles.awinCategoryBadge}>
                    <Text style={{ fontSize: 14 }}>{AWIN_CATEGORY_CONFIG[chosenPrize.awinDeal.category].icon}</Text>
                    <Text style={styles.awinCategoryText}>
                      {AWIN_CATEGORY_CONFIG[chosenPrize.awinDeal.category].label}
                    </Text>
                  </View>
                  <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.sm }]}>
                    {chosenPrize.awinDeal.description}
                  </Text>
                  {chosenPrize.awinDeal.code && (
                    <View style={styles.codeBox}>
                      <Text style={styles.codeText}>{chosenPrize.awinDeal.code}</Text>
                    </View>
                  )}
                  <Pressable style={({ pressed }) => [styles.redeemBtn, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.redeemBtnText}>Redeem Now →</Text>
                  </Pressable>
                </View>
              )}

              {/* Bonus prize on top of the chosen discount */}
              {result.bonus && (
                <View style={styles.scoresPrizeRow}>
                  <Text style={styles.scoresPrizeIcon}>{result.bonus.type === 'scores' ? '🪙' : '🎉'}</Text>
                  <Text style={styles.scoresPrizeValue}>Bonus: {result.bonus.label}</Text>
                </View>
              )}

              <Pressable
                onPress={() => router.back()}
                disabled={!chosenPrize}
                style={({ pressed }) => [styles.doneBtn, (pressed || !chosenPrize) && { opacity: 0.5 }]}
              >
                <Text style={styles.doneBtnText}>Collect & Close</Text>
              </Pressable>
            </Card>
          </Animated.View>
        )}

        {/* Post-scratch upsell for net session → match day */}
        {showUpsell && upsell && (
          <Card style={styles.upsellCard}>
            <Text style={[fonts.title, { textAlign: 'center' }]}>{upsell.title}</Text>
            <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xs }]}>
              {upsell.message}
            </Text>
            <Pressable
              onPress={() => router.replace('/scratch-card/match_day')}
              style={({ pressed }) => [styles.upsellBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.upsellBtnText}>{upsell.ctaLabel}</Text>
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Panel Component ── */

function PanelCard({
  index,
  panel,
  revealed,
  isWicketed,
  onReveal,
  cardTier,
  isNextToReveal,
}: {
  index: number;
  panel: ScratchPanel;
  revealed: boolean;
  isWicketed: boolean;
  onReveal: () => void;
  cardTier: CardTier;
  isNextToReveal: boolean;
}) {
  const display = BALL_DISPLAY[panel.outcome];

  if (!revealed) {
    return (
      <Pressable
        onPress={onReveal}
        style={({ pressed }) => [
          styles.panel,
          styles.panelHidden,
          isNextToReveal && styles.panelGlow,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={{ fontSize: 28 }}>🏏</Text>
        <Text style={styles.panelHiddenLabel}>
          {cardTier === 'match_day' ? `Ball ${index + 1}` : `Panel ${index + 1}`}
        </Text>
      </Pressable>
    );
  }

  if (isWicketed) {
    return (
      <View style={[styles.panel, styles.panelWicketed]}>
        <Text style={{ fontSize: 20, opacity: 0.3 }}>—</Text>
      </View>
    );
  }

  return (
    <View style={[styles.panel, { backgroundColor: display.bgColor, borderColor: display.color }]}>
      <Text style={{ fontSize: 28 }}>{display.emoji}</Text>
      <Text style={[styles.panelLabel, { color: display.color }]}>{display.label}</Text>
      {panel.runs > 0 && (
        <Text style={[styles.panelRuns, { color: display.color }]}>+{panel.runs}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  cardHeader: { gap: spacing.xs, marginBottom: spacing.sm },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  scoreLabel: { color: colors.textMuted as string, fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  scoreValue: { color: colors.gold, fontSize: 48, fontWeight: '800' },

  panelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  panel: {
    width: 100,
    height: 120,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border as string,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  panelHidden: {
    backgroundColor: colors.surface2,
    borderStyle: 'dashed',
  },
  panelGlow: {
    borderColor: colors.brandSky,
    shadowColor: colors.brandSky,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  panelWicketed: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
  },
  panelHiddenLabel: { color: colors.textMuted as string, fontSize: 11, fontWeight: '600' },
  panelLabel: { fontSize: 13, fontWeight: '700' },
  panelRuns: { fontSize: 16, fontWeight: '800' },

  prizeContainer: { marginTop: spacing.md },
  prizeCard: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderWidth: 1,
    backgroundColor: 'rgba(239,200,74,0.06)',
  },
  prizeDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(239,200,74,0.25)',
    marginVertical: spacing.md,
  },

  awinDealCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  awinCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  awinCategoryText: { color: colors.textMuted as string, fontSize: 11, fontWeight: '600' },
  codeBox: {
    backgroundColor: 'rgba(239,200,74,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,200,74,0.25)',
    borderRadius: radius.sm,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  codeText: { color: colors.gold, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  redeemBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  redeemBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  scoresPrizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: 'rgba(239,200,74,0.12)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  scoresPrizeIcon: { fontSize: 24 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
  },
  choicePick: { color: colors.brandSky, fontWeight: '700', fontSize: 14 },
  scoresPrizeValue: { color: colors.gold, fontSize: 18, fontWeight: '800', flexShrink: 1 },

  doneBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },

  upsellCard: {
    borderColor: 'rgba(96,165,250,0.3)',
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  upsellBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  upsellBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
