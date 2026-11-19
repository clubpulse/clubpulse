// The three daily knowledge games share this screen: Umpire's Call, Who Am I? and Scorecard
// Detective. The server sends today's questions without answers; answers are sent back in one go
// and marked there. Who Am I? shows its clues one at a time, and fewer clues means more points.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../constants/theme';

type Question = { prompt: string; options: string[]; clues?: string[] };
type Review = Array<{ correct: boolean; answer: string; why: string; points: number }>;
type Status = {
  game: string;
  title: string;
  blurb: string;
  maxAmount: number;
  note: string | null;
  questions: Question[] | null;
  played: { score: number; maxScore: number; amount: number; review: Review } | null;
};
type Result = { score: number; maxScore: number; amount: number; capped: boolean; card: boolean; review: Review };
type Answer = { choice: number; clues?: number };

export default function KnowledgeGameScreen() {
  const { game } = useLocalSearchParams<{ game: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [clues, setClues] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await api<Status>(`/api/games/knowledge?game=${encodeURIComponent(game ?? '')}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the game.');
    }
  }, [game]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const questions = status?.questions ?? [];
  const q = questions[index];
  const isWhoAmI = !!q?.clues;

  async function next() {
    if (picked === null || !q) return;
    const all = [...answers, isWhoAmI ? { choice: picked, clues } : { choice: picked }];
    if (index + 1 < questions.length) {
      setAnswers(all);
      setIndex(index + 1);
      setPicked(null);
      setClues(1);
      return;
    }
    setSending(true);
    try {
      setResult(await api<Result>('/api/games/knowledge', { method: 'POST', body: { game, answers: all } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send your answers. Please try again.');
    }
    setSending(false);
  }

  const done = result ?? (status?.played ? { ...status.played, capped: false, card: false } : null);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: status?.title ?? 'Game' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!status && !error && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />}
        {error && <View style={[styles.card, { borderColor: colors.danger }]}><Text style={fonts.regular}>{error}</Text></View>}

        {status && !done && q && (
          <>
            <View style={styles.progressRow}>
              <Text style={fonts.small}>Question {index + 1} of {questions.length}</Text>
              {status.maxAmount > 0 && <Text style={styles.prize}>Up to {status.maxAmount} Scores</Text>}
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${(index / questions.length) * 100}%` }]} /></View>
            {status.note && index === 0 && <Text style={fonts.small}>{status.note}</Text>}

            <View style={styles.card}>
              {isWhoAmI ? (
                <>
                  <Text style={styles.prompt}>Who am I?</Text>
                  {q.clues!.slice(0, clues).map((c, i) => (
                    <View key={c} style={styles.clue}>
                      <Text style={styles.clueNo}>{i + 1}</Text>
                      <Text style={[fonts.regular, { flex: 1 }]}>{c}</Text>
                    </View>
                  ))}
                  <Text style={[fonts.small, { marginTop: spacing.sm }]}>Answer now for {5 - clues} point{5 - clues === 1 ? '' : 's'}.</Text>
                  {clues < 4 && picked === null && (
                    <Pressable onPress={() => setClues(clues + 1)} style={styles.outlineBtn} accessibilityRole="button">
                      <Text style={styles.outlineBtnText}>Another clue</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <Text style={styles.prompt}>{q.prompt}</Text>
              )}
            </View>

            {q.options.map((o, i) => (
              <Pressable
                key={o}
                onPress={() => setPicked(i)}
                accessibilityRole="radio"
                accessibilityState={{ selected: picked === i }}
                style={[styles.option, picked === i && styles.optionOn]}
              >
                <Text style={[styles.optionText, picked === i && { color: colors.white }]}>{o}</Text>
              </Pressable>
            ))}

            <Pressable onPress={next} disabled={picked === null || sending} style={[styles.goldBtn, picked === null && { opacity: 0.4 }]} accessibilityRole="button">
              {sending ? <ActivityIndicator color={colors.background} /> : <Text style={styles.goldBtnText}>{index + 1 < questions.length ? 'Next' : 'Finish'}</Text>}
            </Pressable>
          </>
        )}

        {done && (
          <>
            <View style={[styles.card, { alignItems: 'center', borderColor: colors.goldBorder as string }]}>
              <Text style={styles.score}>{done.score} / {done.maxScore}</Text>
              <Text style={fonts.title}>
                {done.amount > 0 ? `+${done.amount} Scores` : done.capped ? 'Weekly Scores limit reached' : status?.maxAmount ? 'No Scores this time' : 'Played for fun'}
              </Text>
              {done.card && <Text style={[fonts.regular, { color: colors.gold, marginTop: 6 }]}>🎟️ A perfect round. You earned a scratch card.</Text>}
              <Text style={[fonts.small, { marginTop: 6 }]}>A new round starts tomorrow.</Text>
            </View>
            {done.review.map((r, i) => (
              <View key={i} style={[styles.card, { borderColor: r.correct ? 'rgba(34,197,94,0.4)' : 'rgba(248,113,113,0.4)' }]}>
                <Text style={[styles.reviewHead, { color: r.correct ? colors.success : colors.danger }]}>
                  {r.correct ? '✓' : '✗'} {i + 1}. {r.answer}
                </Text>
                <Text style={fonts.small}>{r.why}</Text>
              </View>
            ))}
            <Pressable onPress={() => router.back()} style={styles.outlineBtn} accessibilityRole="button">
              <Text style={styles.outlineBtnText}>Back to games</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border as string, padding: spacing.lg },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prize: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  track: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, backgroundColor: colors.brandSky, borderRadius: 3 },
  prompt: { color: colors.white, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  clue: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'flex-start' },
  clueNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brandPrimaryDim, color: colors.brandSky, fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  option: { backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border as string, paddingVertical: 14, paddingHorizontal: spacing.lg },
  optionOn: { borderColor: colors.brandSky, backgroundColor: colors.brandPrimaryDim },
  optionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  goldBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  goldBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  outlineBtn: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 11, paddingHorizontal: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  outlineBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  score: { color: colors.gold, fontSize: 40, fontWeight: '800' },
  reviewHead: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
});
