// The Toss-up: today's readiness check-in (sleep, mood, soreness, stress, each 1 to 5) and your last
// four weeks. Saved to your account and private to you.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { READINESS_FIELDS, summary, type ReadinessKey, type ReadinessToday } from '../../lib/wellness';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

const PINK = '#F472B6';

export default function ReadinessScreen() {
  const [data, setData] = useState<ReadinessToday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<ReadinessKey, number>>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<ReadinessToday>('/api/wellness/readiness');
      setData(d); setError(null);
      if (d.readiness) { setAnswers(d.readiness); setNotes(d.readiness.notes ?? ''); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your check-in.'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const complete = READINESS_FIELDS.every((f) => typeof answers[f.key] === 'number');
  const save = async () => {
    if (!complete || busy) return;
    setBusy(true); setNote(null);
    try { await api('/api/wellness/readiness', { method: 'POST', body: { ...answers, notes } }); setNote('Saved.'); await load(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not save.'); }
    setBusy(false);
  };

  const rows = data?.trend.rows ?? [];
  const byDate = new Map(rows.map((r) => [r.date, r]));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">Readiness check-in</Text>
        <Text style={styles.para}>Four quick questions before you play. 5 is always the best: great sleep, good mood, fresh legs, a calm head. Only you can see your answers.</Text>
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!data && !error && <ActivityIndicator color={PINK} />}

        {data && (
          <>
            {READINESS_FIELDS.map((f) => (
              <View key={f.key} style={styles.card}>
                <Text style={styles.name}>{f.label}</Text>
                <View style={styles.scale}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => { setAnswers((a) => ({ ...a, [f.key]: n })); setNote(null); }} accessibilityRole="button" accessibilityLabel={`${f.label} ${n} of 5`}
                      accessibilityState={{ selected: answers[f.key] === n }} style={[styles.dot, answers[f.key] === n && { backgroundColor: PINK, borderColor: PINK }]}>
                      <Text style={[styles.dotText, answers[f.key] === n && { color: '#04091A' }]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.ends}><Text style={fonts.small}>{f.low}</Text><Text style={fonts.small}>{f.high}</Text></View>
              </View>
            ))}
            <TextInput value={notes} onChangeText={setNotes} placeholder="Anything else? (optional, private)" placeholderTextColor={colors.textSubtle} multiline maxLength={500} style={styles.input} accessibilityLabel="Note" />
            <Pressable onPress={save} disabled={!complete || busy} accessibilityRole="button" style={[styles.btn, (!complete || busy) && { opacity: 0.4 }]}>
              {busy ? <ActivityIndicator color="#04091A" /> : <Text style={styles.btnText}>{data.readiness ? 'Update today' : 'Save check-in'}</Text>}
            </Pressable>
            {note && <Text style={[fonts.small, { color: colors.white }]} accessibilityRole="alert">{note}</Text>}
            {data.readiness && complete && <Text style={styles.para}>{summary(data.readiness)}</Text>}

            <Text style={styles.section} accessibilityRole="header">Your last four weeks</Text>
            {rows.length === 0 ? <Text style={styles.para}>Check in on a few days and your trend will appear here.</Text> : READINESS_FIELDS.map((f) => (
              <View key={f.key} style={styles.card}>
                <Text style={styles.name}>{f.label}</Text>
                <View style={styles.bars} accessibilityLabel={`${f.label} over the last four weeks`}>
                  {data.trend.days.map((d) => {
                    const v = byDate.get(d)?.[f.key];
                    return <View key={d} style={styles.barSlot}><View style={[styles.bar, { height: v ? v * 8 : 2, opacity: v ? 1 : 0.25 }]} /></View>;
                  })}
                </View>
                <Text style={fonts.small}>{rows.length} check-in{rows.length === 1 ? '' : 's'} in four weeks</Text>
              </View>
            ))}
          </>
        )}
        <Text style={fonts.small}>This is general guidance, not medical advice. If something worries you, speak to your GP, a physio or someone you trust.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: display.heavy, fontSize: 26, color: colors.white },
  para: { fontSize: 15, lineHeight: 23, color: colors.text },
  section: { fontFamily: display.bold, fontSize: 17, color: colors.white, marginTop: spacing.sm },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 8 },
  name: { fontFamily: display.bold, fontSize: 16, color: colors.white },
  scale: { flexDirection: 'row', gap: 8 },
  dot: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { minHeight: 70, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, color: colors.text, padding: spacing.md, textAlignVertical: 'top' },
  btn: { backgroundColor: PINK, borderRadius: radius.pill, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 44, gap: 2 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { backgroundColor: PINK, borderRadius: 2 },
});
