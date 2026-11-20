// One Academy lesson: read it, try the drill, then answer three questions. Two right is a pass.
// The answers are marked on the server, which sends back what was right and why.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../lib/api';
import type { AcademyLesson, LessonResult } from '../../lib/academy';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<AcademyLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([null, null, null]);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLesson(await api<AcademyLesson>(`/api/academy/lessons/${encodeURIComponent(id)}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this lesson.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const choose = (question: number, option: number) => {
    if (result) return;
    setAnswers((a) => a.map((v, i) => (i === question ? option : v)));
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      setResult(await api<LessonResult>(`/api/academy/lessons/${encodeURIComponent(id)}`, { method: 'POST', body: { answers } }));
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Could not check your answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setResult(null);
    setAnswers([null, null, null]);
  };

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.content}>
          {error ? (
            <View style={styles.card}>
              <Text style={fonts.regular}>{error}</Text>
              <Pressable onPress={load} style={styles.outlineBtn}>
                <Text style={styles.outlineBtnText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const allAnswered = answers.every((a) => a !== null);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={fonts.small}>
            {lesson.trackTitle} · {lesson.minutes} min read{lesson.passed ? ' · passed' : ''}
          </Text>
          <Text style={[fonts.heading, { marginTop: 4 }]}>{lesson.title}</Text>
          <Text style={[fonts.regular, { marginTop: spacing.sm, lineHeight: 22 }]}>{lesson.intro}</Text>
        </View>

        <View style={styles.card}>
          <Text style={fonts.title}>Key points</Text>
          {lesson.points.map((point, i) => (
            <View key={i} style={styles.pointRow}>
              <View style={styles.pointNum}>
                <Text style={styles.pointNumText}>{i + 1}</Text>
              </View>
              <Text style={[fonts.regular, { flex: 1, lineHeight: 21 }]}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { borderColor: colors.success }]}>
          <Text style={fonts.title}>🎯 Try it</Text>
          <Text style={[fonts.regular, { marginTop: spacing.sm, lineHeight: 21 }]}>{lesson.tryIt}</Text>
        </View>

        <View style={styles.card}>
          <Text style={fonts.title}>Check what you learned</Text>
          <Text style={[fonts.small, { marginTop: 2 }]}>Three questions. Two right is a pass.</Text>
          {lesson.questions.map((question, qi) => {
            const marked = result?.results[qi];
            return (
              <View key={qi} style={{ marginTop: spacing.lg }}>
                <Text style={styles.question}>
                  {qi + 1}. {question.q}
                </Text>
                {question.options.map((option, oi) => {
                  const picked = answers[qi] === oi;
                  const right = !!marked && marked.answer === oi;
                  const wrongPick = !!marked && picked && !marked.correct;
                  return (
                    <Pressable
                      key={oi}
                      onPress={() => choose(qi, oi)}
                      disabled={!!result}
                      style={[styles.option, picked && !marked && styles.optionPicked, right && styles.optionRight, wrongPick && styles.optionWrong]}
                    >
                      <Text style={[styles.optionText, right && { color: colors.success }, wrongPick && { color: colors.danger }]}>{option}</Text>
                    </Pressable>
                  );
                })}
                {marked && (
                  <Text style={[fonts.small, { marginTop: 6 }]}>
                    {marked.correct ? '✓ ' : '✗ '}
                    {marked.why}
                  </Text>
                )}
              </View>
            );
          })}

          {submitError && <Text style={[fonts.small, { color: colors.danger, marginTop: spacing.md }]}>{submitError}</Text>}
          {!result && (
            <Pressable onPress={submit} disabled={!allAnswered || submitting} style={[styles.primaryBtn, (!allAnswered || submitting) && { opacity: 0.4 }]}>
              {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryBtnText}>Check my answers</Text>}
            </Pressable>
          )}
        </View>

        {result && (
          <View style={[styles.card, { borderColor: result.passed ? colors.goldBorder : colors.navyBorder }]}>
            <Text style={styles.resultTitle}>
              {result.passed ? `Passed: ${result.score} out of 3` : `${result.score} out of 3. ${result.score === 1 ? 'Nearly there' : 'Have another go'}`}
            </Text>
            {result.passed ? (
              <Text style={[fonts.regular, { marginTop: 4 }]}>
                {result.amount > 0 ? `⭐ ${result.amount} Scores added. ` : ''}
                {result.trackDone ? `You have finished ${result.trackDone}${result.trackBonus > 0 ? `: ⭐ ${result.trackBonus} bonus Scores` : ''}. ` : ''}
                Now go and do the Try it drill.
              </Text>
            ) : (
              <Text style={[fonts.regular, { marginTop: 4 }]}>Read the notes under each question, then have another go. There is no limit on tries.</Text>
            )}
            {!result.passed && (
              <Pressable onPress={retry} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Try again</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.back()} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Back</Text>
            </Pressable>
          </View>
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
  pointRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'flex-start' },
  pointNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brandPrimaryDim, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  pointNumText: { color: colors.brandSky, fontSize: 12, fontWeight: '700' },
  question: { color: colors.white, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  option: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 11, paddingHorizontal: 12, marginTop: 8 },
  optionPicked: { borderColor: colors.brandSky, backgroundColor: colors.brandPrimaryDim },
  optionRight: { borderColor: colors.success, backgroundColor: colors.successDim },
  optionWrong: { borderColor: colors.danger },
  optionText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  resultTitle: { color: colors.white, fontFamily: display.heavy, fontSize: 17 },
  primaryBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md,
  },
  outlineBtnText: { color: colors.brandSky, fontSize: 15, fontWeight: '700' },
});
