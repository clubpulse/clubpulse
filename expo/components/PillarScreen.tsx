// One pillar's page, opened from the footer. A header in the pillar's own colours, its one or two
// most important tiles large at the top, and everything else as smaller tiles underneath.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoles } from '../hooks/useRoles';
import { pillarByKey, pillarTiles, type PillarKey } from '../lib/pillars';
import { DEALS_ENABLED, STORE_ENABLED } from '../constants/features';
import { GlowCard, Hero } from './Magic';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

export function PillarScreen({ pillar: key }: { pillar: PillarKey }) {
  const pillar = pillarByKey(key);
  const router = useRouter();
  const { active, isAdmin, juniors, approvalQueue } = useRoles();
  // Junior accounts are held back by each screen and by the server; no pillar tile is adult-only
  const { lead, rest } = pillarTiles(key, { roles: active, junior: false, switches: { store: STORE_ENABLED, deals: DEALS_ENABLED, cards: false } });

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

        {/* The most important tiles, in the pillar's colours */}
        {lead.map((tile, i) => {
          const tint = i === 0 ? pillar.from : pillar.to;
          return (
            <Pressable key={tile.key} onPress={() => open(tile.route)} accessibilityRole="button" accessibilityLabel={`${tile.label}. ${tile.detail}`}
              style={({ pressed }) => [styles.lead, { backgroundColor: `${tint}26`, borderColor: `${tint}88` }, pressed && { opacity: 0.8 }]}>
              <View style={[styles.leadIcon, { backgroundColor: tint }]}><Text style={{ fontSize: 28 }}>{tile.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leadLabel}>{tile.label}</Text>
                <Text style={styles.leadDetail} numberOfLines={2}>{tile.detail}</Text>
              </View>
              {(waiting[tile.key] ?? 0) > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{waiting[tile.key]}</Text></View>}
              <Ionicons name="arrow-forward" size={20} color={tint} />
            </Pressable>
          );
        })}

        {rest.length > 0 && (
          <>
            <Text style={styles.section} accessibilityRole="header">More in {pillar.title}</Text>
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

        {lead.length === 0 && rest.length === 0 && !pillar.soon && (
          <Text style={fonts.small}>Nothing here for your role yet.</Text>
        )}

        {pillar.soon && (
          <View style={[styles.soon, { borderColor: `${pillar.from}44` }]}>
            <Text style={[styles.soonEyebrow, { color: pillar.from }]}>ON THE WAY</Text>
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
  lead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, minHeight: 96 },
  leadIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  leadLabel: { fontFamily: display.heavy, fontSize: 19, color: colors.white, letterSpacing: -0.3 },
  leadDetail: { fontSize: 13.5, lineHeight: 18, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
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
