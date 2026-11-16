import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { type UpsellConfig, type UpsellTrigger, getUpsell } from '../lib/iap';
import { colors, fonts, radius, spacing } from '../constants/theme';

interface UpsellBannerProps {
  trigger: UpsellTrigger;
  context?: { streakDays?: number; scoresShort?: number };
  /** Override the config if you want custom copy */
  config?: UpsellConfig;
  compact?: boolean;
}

/**
 * Drop-in upsell banner for any screen.
 *
 * Usage:
 *   <UpsellBanner trigger="streak_at_risk" context={{ streakDays: 14 }} />
 *   <UpsellBanner trigger="wallet_nudge" compact />
 *   <UpsellBanner trigger="marketplace_short" context={{ scoresShort: 87 }} />
 */
export function UpsellBanner({ trigger, context, config: overrideConfig, compact }: UpsellBannerProps) {
  const cfg = overrideConfig ?? getUpsell(trigger, context);

  const productToRoute: Record<string, string> = {
    net_session_card: '/scratch-card/net_session',
    match_day_card: '/scratch-card/match_day',
    streak_shield: '/store',
    streak_shield_3pack: '/store',
    coach_ai_session: '/store',
    coach_ai_3pack: '/store',
    profile_badge: '/store',
    sporting_soul_theme: '/store',
    profile_frame: '/store',
  };

  const handleCta = () => {
    const route = productToRoute[cfg.ctaProduct] ?? '/store';
    router.push(route as any);
  };

  const handleAlt = () => {
    if (!cfg.altCtaProduct) return;
    const route = productToRoute[cfg.altCtaProduct] ?? '/store';
    router.push(route as any);
  };

  if (compact) {
    return (
      <Pressable onPress={handleCta} style={({ pressed }) => [styles.compactBanner, pressed && { opacity: 0.7 }]}>
        <Text style={styles.compactText}>{cfg.message}</Text>
        <Text style={styles.compactCta}>{cfg.ctaLabel} →</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={[fonts.title, { fontSize: 15 }]}>{cfg.title}</Text>
      <Text style={[fonts.small, { marginTop: 2 }]}>{cfg.message}</Text>
      <View style={styles.ctaRow}>
        <Pressable onPress={handleCta} style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.ctaBtnText}>{cfg.ctaLabel}</Text>
        </Pressable>
        {cfg.altCtaLabel && (
          <Pressable onPress={handleAlt} style={({ pressed }) => [styles.altBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.altBtnText}>{cfg.altCtaLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(96,165,250,0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  ctaBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  ctaBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  altBtn: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  altBtnText: { color: colors.brandSky, fontWeight: '600', fontSize: 13 },

  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239,200,74,0.06)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,200,74,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  compactText: { color: colors.textMuted as string, fontSize: 12, flex: 1 },
  compactCta: { color: colors.gold, fontSize: 12, fontWeight: '700', marginLeft: spacing.sm },
});
