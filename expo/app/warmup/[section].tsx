// One section of Warm-Up: Watch the Ball, Still Head, Between the Ears, Match Day, Reading the
// Game or Team Talk. Lists what is inside it.

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sectionByKey, type Item } from '../../lib/warmup';
import { getDoneWeeks } from '../../lib/warmupStore';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

const PINK = '#F472B6';
const KIND: Record<Item['kind'], string> = { guided: 'Guided', read: 'Read', checklist: 'Checklist', tips: 'Tips', week: 'Lesson and drill' };

export default function WarmupSection() {
  const { section: key } = useLocalSearchParams<{ section: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const section = sectionByKey(key ?? '');

  const [done, setDone] = useState<string[]>([]);

  useEffect(() => { if (section) navigation.setOptions({ title: section.title }); }, [navigation, section]);
  // Ticks are read each time the page comes back into view, so a week just finished shows as done
  useFocusEffect(useCallback(() => { getDoneWeeks().then(setDone); }, []));
  if (!section) return <SafeAreaView style={styles.safe}><Text style={[fonts.small, { padding: spacing.lg }]}>This page was not found.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.plain}>{section.plain.toUpperCase()}</Text>
        <Text style={styles.intro}>{section.intro}</Text>
        {section.key === 'training' && (
          <Text style={styles.progress}>{section.items.filter((i) => done.includes(i.id)).length} of {section.items.length} weeks done</Text>
        )}

        {section.items.map((item) => (
          <Pressable key={item.id} onPress={() => router.push({ pathname: '/warmup/item/[id]', params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={`${item.title}. ${KIND[item.kind]}, ${item.minutes} ${item.minutes === 1 ? 'minute' : 'minutes'}`}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={fonts.small}>{item.summary}</Text>
              <Text style={styles.meta}>{KIND[item.kind]} · {item.minutes} min</Text>
            </View>
            {done.includes(item.id)
              ? <Ionicons name="checkmark-circle" size={26} color={PINK} />
              : <Ionicons name={item.kind === 'guided' ? 'play-circle' : 'chevron-forward'} size={item.kind === 'guided' ? 30 : 18} color={item.kind === 'guided' ? PINK : colors.textSubtle} />}
          </Pressable>
        ))}

        {section.key === 'training' && (
          <Pressable onPress={() => router.push('/warmup/routine')} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>My Routine</Text>
              <Text style={fonts.small}>Build the few seconds you repeat before every ball.</Text>
              <Text style={styles.meta}>Tool</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </Pressable>
        )}

        <Pressable onPress={() => router.push('/warmup/support')} accessibilityRole="button" style={styles.support}>
          <Text style={styles.supportText}>Finding things hard? Talk to someone</Text>
          <Ionicons name="chevron-forward" size={16} color={PINK} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  plain: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: PINK },
  intro: { fontSize: 15, lineHeight: 22, color: colors.text },
  progress: { fontSize: 13, fontWeight: '700', color: PINK },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(244,114,182,0.25)', padding: spacing.lg },
  title: { fontFamily: display.bold, fontSize: 17, color: colors.white },
  meta: { fontSize: 12, fontWeight: '600', color: PINK, marginTop: 2 },
  support: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginTop: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(244,114,182,0.45)' },
  supportText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
