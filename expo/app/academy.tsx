// The Academy: short lessons in four tracks, each with a three-question check, plus a personal
// weekly practice plan. This screen shows the level, the plan and every lesson.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import type { Academy } from '../lib/academy';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

export default function AcademyScreen() {
  const router = useRouter();
  const [data, setData] = useState<Academy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<Academy>('/api/academy'));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the Academy.');
    }
  }, []);

  // Reload on return so a lesson just passed shows as done
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openLesson = (id: string) => router.push({ pathname: '/lesson/[id]', params: { id } });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      >
        {!data && !error && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />}
        {error && (
          <View style={styles.card}>
            <Text style={fonts.regular}>{error}</Text>
            <Pressable onPress={load} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {data && (
          <>
            {data.unavailable && (
              <View style={styles.card}>
                <Text style={fonts.small}>{data.unavailable}</Text>
              </View>
            )}

            {/* Level */}
            <View style={[styles.card, { borderColor: colors.goldBorder }]}>
              <Text style={fonts.small}>Your level</Text>
              <Text style={styles.level}>{data.level.title}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((data.level.passed / data.level.total) * 100)}%` }]} />
              </View>
              <Text style={[fonts.small, { marginTop: 6 }]}>
                {data.level.passed} of {data.level.total} lessons passed
                {data.level.next ? ` · ${data.level.next.at - data.level.passed} more to reach ${data.level.next.title}` : ' · every lesson done'}
              </Text>
              {data.scores.lesson > 0 && (
                <Text style={[fonts.small, { marginTop: 4 }]}>
                  ⭐ {data.scores.lesson} Scores the first time you pass a lesson, {data.scores.track} more for finishing a track.
                </Text>
              )}
            </View>

            {/* Personal plan */}
            <View style={styles.card}>
              <View style={styles.headRow}>
                <Text style={fonts.title}>My practice plan</Text>
                {data.plan && <Text style={fonts.small}>{data.plan.days.length} sessions</Text>}
              </View>
              {data.plan ? (
                <>
                  <Text style={[fonts.small, { marginTop: 4 }]}>For: {data.plan.focus}</Text>
                  <Text style={[fonts.regular, { marginTop: spacing.sm }]}>{data.plan.summary}</Text>
                  <Pressable onPress={() => router.push('/academy-plan')} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Open my plan</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={[fonts.small, { marginTop: 4 }]}>
                    Tell Coach AI what you want to get better at and get a week of sessions built around it.
                  </Text>
                  <Pressable onPress={() => router.push('/academy-plan')} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Make my plan</Text>
                  </Pressable>
                </>
              )}
            </View>

            {data.tracks.length > 0 && data.tracks.every((t) => t.total > 0 && t.done === t.total) && (
              <Pressable onPress={() => router.push({ pathname: '/academy-certificate', params: { track: 'graduate' } })} accessibilityRole="button" style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>🎓 Academy Graduate certificate</Text>
              </Pressable>
            )}

            {/* Tracks */}
            {data.tracks.map((t) => (
              <View key={t.key} style={styles.card}>
                <View style={styles.headRow}>
                  <Text style={fonts.title}>
                    {t.icon} {t.title}
                  </Text>
                  <Text style={[fonts.small, t.done === t.total && { color: colors.success, fontWeight: '700' }]}>
                    {t.done}/{t.total}
                  </Text>
                </View>
                <Text style={[fonts.small, { marginTop: 4 }]}>{t.blurb}</Text>
                {t.done === t.total && t.total > 0 && (
                  <Pressable onPress={() => router.push({ pathname: '/academy-certificate', params: { track: t.key } })} accessibilityRole="button" style={styles.outlineBtn}>
                    <Text style={styles.outlineBtnText}>🎓 View your certificate</Text>
                  </Pressable>
                )}
                {t.lessons.map((l) => (
                  <Pressable key={l.id} onPress={() => openLesson(l.id)} style={styles.lessonRow}>
                    <Ionicons
                      name={l.passed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={l.passed ? colors.success : colors.textSubtle}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>{l.title}</Text>
                      <Text style={fonts.small}>
                        {l.minutes} min read
                        {l.passed ? ` · passed ${l.bestScore}/3` : l.bestScore !== null ? ` · best ${l.bestScore}/3, try again` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </Pressable>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.navyBorder, padding: spacing.lg,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  level: { color: colors.gold, fontFamily: display.heavy, fontSize: 24, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface2, marginTop: spacing.md, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md,
  },
  lessonTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  primaryBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md,
  },
  outlineBtnText: { color: colors.brandSky, fontSize: 15, fontWeight: '700' },
});
