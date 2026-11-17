// My practice plan: say what you want to get better at and Coach AI writes a week of sessions,
// linking to Academy lessons where they fit. Shows the current plan, with a form to make a new one.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import type { Academy, AcademyPlan } from '../lib/academy';
import { colors, fonts, radius, spacing } from '../constants/theme';

const ROLES = [
  { key: 'batter', label: 'Batter' },
  { key: 'bowler', label: 'Bowler' },
  { key: 'all-rounder', label: 'All-rounder' },
  { key: 'keeper', label: 'Keeper' },
  { key: 'new', label: 'New to cricket' },
];
const SESSIONS = [2, 3, 4, 5];
const MINUTES = [15, 30, 45];
const IDEAS = ['Playing spin', 'Bowling a better line', 'Catching under pressure', 'Running between the wickets'];

export default function AcademyPlanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<AcademyPlan | null>(null);
  const [plansLeft, setPlansLeft] = useState(0);
  const [editing, setEditing] = useState(false);
  const [focus, setFocus] = useState('');
  const [role, setRole] = useState('batter');
  const [sessions, setSessions] = useState(3);
  const [minutes, setMinutes] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<Academy>('/api/academy');
      setPlan(data.plan);
      setPlansLeft(data.plansLeftThisWeek);
      setEditing(!data.plan);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your plan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await api<{ plan: AcademyPlan; plansLeftThisWeek: number }>('/api/academy/plan', {
        method: 'POST',
        body: { focus, role, sessions, minutes },
      });
      setPlan(res.plan);
      setPlansLeft(res.plansLeftThisWeek);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not make your plan.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={[styles.card, { borderColor: colors.danger }]}>
            <Text style={[fonts.regular, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {editing ? (
          <View style={styles.card}>
            <Text style={fonts.title}>What do you want to get better at?</Text>
            <TextInput
              value={focus}
              onChangeText={setFocus}
              placeholder="For example: playing spin"
              placeholderTextColor={colors.textSubtle}
              maxLength={200}
              multiline
              style={styles.input}
            />
            <View style={styles.chipRow}>
              {IDEAS.map((idea) => (
                <Pressable key={idea} onPress={() => setFocus(idea)} style={styles.ideaChip}>
                  <Text style={styles.ideaChipText}>{idea}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>I am a</Text>
            <View style={styles.chipRow}>
              {ROLES.map((r) => (
                <Chip key={r.key} label={r.label} on={role === r.key} onPress={() => setRole(r.key)} />
              ))}
            </View>

            <Text style={styles.label}>Sessions this week</Text>
            <View style={styles.chipRow}>
              {SESSIONS.map((n) => (
                <Chip key={n} label={String(n)} on={sessions === n} onPress={() => setSessions(n)} />
              ))}
            </View>

            <Text style={styles.label}>Minutes each</Text>
            <View style={styles.chipRow}>
              {MINUTES.map((n) => (
                <Chip key={n} label={String(n)} on={minutes === n} onPress={() => setMinutes(n)} />
              ))}
            </View>

            <Pressable
              onPress={create}
              disabled={creating || focus.trim().length < 3 || plansLeft <= 0}
              style={[styles.primaryBtn, (creating || focus.trim().length < 3 || plansLeft <= 0) && { opacity: 0.4 }]}
            >
              {creating ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryBtnText}>Make my plan</Text>}
            </Pressable>
            <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.sm }]}>
              {creating
                ? 'Coach AI is writing your week. This takes a few seconds.'
                : plansLeft > 0
                  ? `${plansLeft} new plan${plansLeft === 1 ? '' : 's'} left this week.`
                  : 'You have made three plans this week. Give your current one a go first.'}
            </Text>
            {plan && (
              <Pressable onPress={() => setEditing(false)} style={styles.outlineBtn}>
                <Text style={styles.outlineBtnText}>Back to my current plan</Text>
              </Pressable>
            )}
          </View>
        ) : plan ? (
          <>
            <View style={[styles.card, { borderColor: colors.goldBorder }]}>
              <Text style={fonts.small}>My plan for</Text>
              <Text style={[fonts.heading, { marginTop: 2 }]}>{plan.focus}</Text>
              <Text style={[fonts.regular, { marginTop: spacing.sm, lineHeight: 21 }]}>{plan.summary}</Text>
              <Text style={[fonts.small, { marginTop: spacing.sm }]}>
                {plan.fromCoachAi ? 'Written by Coach AI.' : 'Built from Academy lessons.'} Warm up first, and stop if anything hurts.
              </Text>
            </View>

            {plan.days.map((d) => (
              <View key={d.day} style={styles.card}>
                <View style={styles.headRow}>
                  <Text style={styles.dayLabel}>SESSION {d.day}</Text>
                  <Text style={fonts.small}>{d.minutes} min</Text>
                </View>
                <Text style={[fonts.title, { marginTop: 4 }]}>{d.title}</Text>
                <Text style={[fonts.regular, { marginTop: spacing.sm, lineHeight: 21 }]}>{d.activity}</Text>
                {d.lessonId && (
                  <Pressable onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: d.lessonId! } })} style={styles.lessonLink}>
                    <Ionicons name="book-outline" size={15} color={colors.brandSky} />
                    <Text style={styles.lessonLinkText} numberOfLines={1}>
                      Lesson: {d.lessonTitle}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.brandSky} />
                  </Pressable>
                )}
              </View>
            ))}

            <Pressable onPress={() => setEditing(true)} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Make a new plan</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: colors.background }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.navyBorder, padding: spacing.lg,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, color: colors.white, fontSize: 16,
    paddingHorizontal: 12, paddingVertical: 12, marginTop: spacing.md, minHeight: 52,
  },
  label: { color: colors.textMuted as string, fontSize: 13, fontWeight: '700', marginTop: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.navyBorder, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  ideaChip: { borderRadius: radius.pill, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 6 },
  ideaChipText: { color: colors.brandSky, fontSize: 13, fontWeight: '600' },
  dayLabel: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  lessonLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  lessonLinkText: { color: colors.brandSky, fontSize: 14, fontWeight: '700', flex: 1 },
  primaryBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md,
  },
  outlineBtnText: { color: colors.brandSky, fontSize: 15, fontWeight: '700' },
});
