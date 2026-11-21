// Honours Board: every badge a member can earn, grouped by pillar. An earned badge can be shared
// through the phone's own share sheet (Messages, WhatsApp, Instagram and so on). What is shared is
// a sentence and a link to a public page about the badge. Neither names the member or their club.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

type Group = 'technique' | 'wellness' | 'academy' | 'club' | 'scores';
type Badge = {
  key: string;
  group: Group;
  icon: string;
  title: string;
  how: string;
  progress: number;
  target: number;
  earned: boolean;
  share: { message: string; url: string } | null;
};
type Response = { badges: Badge[]; earned: number; total: number };

// Same colours as the pillar pages, and gold for Scores
const GROUPS: Array<{ key: Group; title: string; tint: string }> = [
  { key: 'technique', title: 'The Nets', tint: '#FBBF24' },
  { key: 'wellness', title: 'Warm-Up', tint: '#F472B6' },
  { key: 'academy', title: 'Academy', tint: '#2DD4BF' },
  { key: 'club', title: 'Pavilion', tint: '#60A5FA' },
  { key: 'scores', title: 'Bonus Points', tint: colors.gold },
];

async function shareBadge(b: Badge) {
  if (!b.share) return;
  try {
    // iOS takes the link on its own, which gives the picture preview; Android wants it in the text
    await Share.share(Platform.OS === 'ios' ? { message: b.share.message, url: b.share.url } : { message: `${b.share.message} ${b.share.url}` });
  } catch {
    // Closing the share sheet is not an error worth showing
  }
}

export default function BadgesScreen() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // With over a hundred badges, "Earned" is the quick way to find the ones to share
  const [only, setOnly] = useState<'all' | 'earned'>('all');

  const load = useCallback(async () => {
    try {
      setData(await api<Response>('/api/badges'));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your badges.');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>HONOURS BOARD</Text>
          <Text style={styles.heroCount}>{data ? `${data.earned} of ${data.total}` : ' '}</Text>
          <Text style={styles.heroText}>badges earned. Tap Share on any badge you have earned to show it off.</Text>
        </View>

        {data && (
          <View style={styles.filter}>
            {(['all', 'earned'] as const).map((f) => (
              <Pressable key={f} onPress={() => setOnly(f)} accessibilityRole="button" accessibilityState={{ selected: only === f }}
                style={[styles.chip, only === f && styles.chipOn]}>
                <Text style={[styles.chipText, only === f && { color: colors.background }]}>{f === 'all' ? `All ${data.total}` : `Earned ${data.earned}`}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {error && <Text style={[fonts.regular, { color: colors.danger }]}>{error}</Text>}
        {!data && !error && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />}

        {data && GROUPS.map((g) => {
          const all = data.badges.filter((b) => b.group === g.key);
          const list = only === 'earned' ? all.filter((b) => b.earned) : all;
          if (list.length === 0) return null;
          return (
            <View key={g.key} style={{ gap: spacing.md }}>
              <View style={styles.groupHead}>
                <Text style={[styles.groupTitle, { color: g.tint }]}>{g.title}</Text>
                <Text style={fonts.small}>{all.filter((b) => b.earned).length} of {all.length}</Text>
              </View>
              {list.map((b) => (
                <View key={b.key} style={[styles.badge, b.earned && { borderColor: g.tint, backgroundColor: `${g.tint}14` }]}
                  accessible accessibilityLabel={`${b.title}. ${b.earned ? 'Earned' : `${b.progress} of ${b.target}. ${b.how}`}`}>
                  <View style={[styles.medal, b.earned ? { borderColor: g.tint, backgroundColor: `${g.tint}26` } : styles.medalLocked]}>
                    <Text style={[styles.medalIcon, !b.earned && { opacity: 0.35 }]}>{b.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.badgeTitle, !b.earned && { color: colors.textMuted }]}>{b.title}</Text>
                    <Text style={fonts.small}>{b.how}</Text>
                    {!b.earned && b.target > 1 && (
                      <>
                        <View style={styles.track}>
                          <View style={[styles.fill, { width: `${Math.round((b.progress / b.target) * 100)}%`, backgroundColor: g.tint }]} />
                        </View>
                        <Text style={fonts.small}>{b.progress.toLocaleString('en-GB')} of {b.target.toLocaleString('en-GB')}</Text>
                      </>
                    )}
                  </View>
                  {b.earned ? (
                    <Pressable onPress={() => shareBadge(b)} accessibilityRole="button" accessibilityLabel={`Share the ${b.title} badge`}
                      style={({ pressed }) => [styles.shareBtn, { backgroundColor: g.tint }, pressed && { opacity: 0.8 }]}>
                      <Ionicons name="share-outline" size={15} color={colors.background} />
                      <Text style={styles.shareText}>Share</Text>
                    </Pressable>
                  ) : (
                    <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                  )}
                </View>
              ))}
            </View>
          );
        })}

        {data && only === 'earned' && data.earned === 0 && <Text style={[fonts.regular, { textAlign: 'center' }]}>Nothing earned yet. Your first badge is close.</Text>}
        {data && <Text style={[fonts.small, { textAlign: 'center' }]}>Sharing sends a sentence and a link about the badge. It does not include your name or your club.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  hero: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.goldDim, padding: spacing.xl, alignItems: 'center', gap: 4 },
  heroKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: colors.gold },
  heroCount: { fontFamily: display.heavy, fontSize: 40, color: colors.white },
  heroText: { fontSize: 14, lineHeight: 20, color: colors.text, textAlign: 'center' },
  filter: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.text },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  groupTitle: { fontFamily: display.heavy, fontSize: 18 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface1, padding: spacing.md },
  medal: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  medalLocked: { borderColor: colors.border, backgroundColor: 'transparent' },
  medalIcon: { fontSize: 26 },
  badgeTitle: { fontSize: 16, fontWeight: '800', color: colors.white },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 2 },
  fill: { height: 6, borderRadius: 3 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  shareText: { fontSize: 13, fontWeight: '800', color: colors.background },
});
