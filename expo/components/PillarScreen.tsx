// One pillar's page, opened from the footer. The same layout as the role dashboards: a header in
// the page's own colour, four tiles, one large tile beneath them, then smaller tiles.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRoles } from '../hooks/useRoles';
import { pillarByKey, pillarTiles, type PillarKey } from '../lib/pillars';
import { DEALS_ENABLED, STORE_ENABLED } from '../constants/features';
import { GlowCard, Hero } from './Magic';
import { DailyThought } from './DailyThought';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

// How each pillar earns Scores, in one line
const EARN: Record<PillarKey, string> = {
  technique: 'Earn Scores for analysing your technique.',
  community: 'Earn Scores for turning up for your club.',
  wellness: 'Earn Scores for Warm-Up sessions and Mind Nets weeks.',
  academy: 'Earn Scores for lessons, the daily question and games.',
};

export function PillarScreen({ pillar: key }: { pillar: PillarKey }) {
  const pillar = pillarByKey(key);
  const router = useRouter();
  const { active, isAdmin, juniors, approvalQueue } = useRoles();
  // Junior accounts are held back by each screen and by the server; no pillar tile is adult-only
  const { top, big, rest } = pillarTiles(key, { roles: active, junior: false, switches: { store: STORE_ENABLED, deals: DEALS_ENABLED, cards: false } });

  const waiting: Record<string, number> = {
    club: isAdmin ? approvalQueue.length : 0,
    children: juniors.filter((j) => j.link_status === 'pending' || !j.consent_given).length,
  };
  const open = (route: string) => router.push(route as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Hero from={pillar.from} to={pillar.to}>
          <View style={styles.heroTop}>
            <Text style={styles.title} accessibilityRole="header">{pillar.title}</Text>
            <Text style={styles.heroIcon} accessibilityElementsHidden importantForAccessibility="no">{pillar.emoji}</Text>
          </View>
          <Text style={styles.tagline}>{pillar.tagline}</Text>
        </Hero>

        {/* Rewards run through every pillar: what is done here counts towards the Run Chase */}
        <Pressable onPress={() => open('/rewards')} accessibilityRole="button" accessibilityLabel={`Run Chase. ${EARN[key]} Open your tasks`}
          style={({ pressed }) => [styles.earn, pressed && { opacity: 0.75 }]}>
          <Text style={{ fontSize: 18 }}>⭐</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.earnTitle}>Run Chase</Text>
            <Text style={styles.earnText}>{EARN[key]}</Text>
          </View>
          <Text style={styles.earnLink}>My tasks ›</Text>
        </Pressable>

        {/* Warm-Up opens with the thought for the day */}
        {key === 'wellness' && <DailyThought />}

        {/* Four tiles, the same place every page keeps its four */}
        {top.length > 0 && (
          <View style={styles.grid}>
            {top.map((tile, i) => (
              <GlowCard key={tile.key} index={i + 1} tint={i % 2 === 0 ? pillar.from : pillar.to} onPress={() => open(tile.route)} label={`${tile.label}. ${tile.detail}`} slot={styles.small}
                style={{ backgroundColor: `${pillar.from}14`, borderColor: `${pillar.from}55` }}>
                <View style={styles.smallRow}>
                  <View style={[styles.topIcon, { backgroundColor: i % 2 === 0 ? pillar.from : pillar.to }]}><Text style={{ fontSize: 20 }}>{tile.icon}</Text></View>
                  {(waiting[tile.key] ?? 0) > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{waiting[tile.key]}</Text></View>}
                </View>
                <Text style={styles.topLabel} numberOfLines={1}>{tile.label}</Text>
                <Text style={styles.topDetail} numberOfLines={2}>{tile.detail}</Text>
              </GlowCard>
            ))}
          </View>
        )}

        {/* One large tile beneath them: what this pillar is for */}
        {big && (
          <Pressable onPress={() => open(big.route)} accessibilityRole="button" accessibilityLabel={`${big.label}. ${big.detail}`}
            style={({ pressed }) => [styles.lead, { backgroundColor: `${pillar.from}26`, borderColor: `${pillar.from}88` }, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.leadEyebrow, { color: pillar.from }]}>TAKE GUARD</Text>
            <View style={styles.leadRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.leadLabel}>{big.label}</Text>
                <Text style={styles.leadDetail} numberOfLines={2}>{big.detail}</Text>
              </View>
              {(waiting[big.key] ?? 0) > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{waiting[big.key]}</Text></View>}
              <View style={[styles.leadIcon, { backgroundColor: pillar.from }]}><Text style={{ fontSize: 28 }}>{big.icon}</Text></View>
            </View>
          </Pressable>
        )}

        {rest.length > 0 && (
          <>
            <Text style={styles.section} accessibilityRole="header">Extras</Text>
            <View style={styles.grid}>
              {rest.map((tile, i) => (
                <GlowCard key={tile.key} index={i + 1} tint={i % 2 === 0 ? pillar.from : pillar.to} onPress={() => open(tile.route)} label={`${tile.label}. ${tile.detail}`} slot={styles.small}>
                  <View style={styles.smallRow}>
                    <Text style={{ fontSize: 20 }}>{tile.icon}</Text>
                    {(waiting[tile.key] ?? 0) > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{waiting[tile.key]}</Text></View>}
                  </View>
                  <Text style={styles.smallLabel} numberOfLines={1}>{tile.label}</Text>
                  <Text style={styles.smallDetail} numberOfLines={1}>{tile.detail}</Text>
                </GlowCard>
              ))}
            </View>
          </>
        )}

        {top.length === 0 && !big && rest.length === 0 && !pillar.soon && (
          <Text style={fonts.small}>Nothing here for your role yet.</Text>
        )}

        {pillar.soon && (
          <View style={[styles.soon, { borderColor: `${pillar.from}44` }]}>
            <Text style={[styles.soonEyebrow, { color: pillar.from }]}>NEXT IN</Text>
            <Text style={styles.soonText}>{pillar.soon}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, fontFamily: display.heavy, fontSize: 28, color: colors.white, letterSpacing: -0.6, lineHeight: 36 },
  heroIcon: { fontSize: 40, transform: [{ rotate: '-6deg' }] },
  tagline: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.74)', marginTop: 8 },
  lead: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg },
  leadEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 8 },
  topIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  topLabel: { fontSize: 15, fontWeight: '700', color: colors.white, marginTop: 10 },
  topDetail: { fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  leadIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  leadLabel: { fontFamily: display.heavy, fontSize: 23, color: colors.white, letterSpacing: -0.3 },
  leadDetail: { fontSize: 13.5, lineHeight: 18, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  earn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(239,200,74,0.35)', backgroundColor: 'rgba(239,200,74,0.08)', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  earnTitle: { fontSize: 13, fontWeight: '800', color: colors.gold, letterSpacing: 0.3 },
  earnText: { fontSize: 13, lineHeight: 18, color: colors.text },
  earnLink: { fontSize: 13, fontWeight: '700', color: colors.gold },
  section: { fontFamily: display.heavy, fontSize: 17, color: colors.white, letterSpacing: -0.2, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  small: { flexBasis: '47%', flexGrow: 1, minWidth: 140 },
  smallRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallLabel: { fontSize: 14, fontWeight: '700', color: colors.white, marginTop: 8 },
  smallDetail: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.white },
  soon: { borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', padding: spacing.lg },
  soonEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  soonText: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
});
