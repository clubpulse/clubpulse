// The games hub: every game in the app in one place.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../constants/theme';

const GAMES: Array<{ key: string; icon: string; title: string; detail: string; when: string; tint: string; route: string; params?: Record<string, string> }> = [
  { key: 'umpire', icon: '☝️', title: "Umpire's Call", detail: 'Five decisions. What would you give?', when: 'Daily', tint: '#60A5FA', route: '/knowledge/[game]', params: { game: 'umpire' } },
  { key: 'whoami', icon: '🕵️', title: 'Who Am I?', detail: 'Name three cricketers from as few clues as you can.', when: 'Daily', tint: '#A78BFA', route: '/knowledge/[game]', params: { game: 'whoami' } },
  { key: 'scorecard', icon: '🔢', title: 'Scorecard Detective', detail: 'Five scorecards with a number missing.', when: 'Daily', tint: '#22C55E', route: '/knowledge/[game]', params: { game: 'scorecard' } },
  { key: 'manager', icon: '📋', title: 'Season Manager', detail: 'Pick your eleven, manage tired legs, win the league.', when: 'One match a day', tint: '#F97316', route: '/season-manager' },
  { key: 'auction', icon: '🔨', title: 'Auction Room', detail: 'Build a squad of 15 at a T20 franchise auction.', when: 'Daily', tint: '#EFC84A', route: '/auction-room' },
];

export default function GamesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.small}>Free to play. Scores are earned for doing well and nothing is ever staked.</Text>
        {GAMES.map((g) => (
          <Pressable
            key={g.key}
            onPress={() => router.push((g.params ? { pathname: g.route, params: g.params } : g.route) as never)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
          >
            <View style={[styles.icon, { backgroundColor: `${g.tint}26`, borderColor: `${g.tint}66` }]}>
              <Text style={{ fontSize: 22 }}>{g.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fonts.title}>{g.title}</Text>
              <Text style={fonts.small}>{g.detail}</Text>
              <Text style={[styles.when, { color: g.tint }]}>{g.when}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border as string, padding: spacing.lg },
  icon: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  when: { fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },
});
