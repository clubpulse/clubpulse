// Recovery log: how your body feels after playing or training. Private to you.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { SERIOUS_NUDGE, SERIOUS_WORDS, prettyDate, type RecoveryRow } from '../../lib/wellness';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

const PINK = '#F472B6';

export default function RecoveryScreen() {
  const [rows, setRows] = useState<RecoveryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [activity, setActivity] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows((await api<{ rows: RecoveryRow[] }>('/api/wellness/recovery')).rows); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your log.'); setRows([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    setBusy(true); setNote(null);
    try {
      await api('/api/wellness/recovery', { method: 'POST', body: { soreness, activity, notes } });
      setNote(SERIOUS_WORDS.test(`${activity} ${notes}`) ? `Saved. ${SERIOUS_NUDGE}` : 'Saved.');
      setSoreness(null); setActivity(''); setNotes(''); await load();
    } catch (e) { setNote(e instanceof Error ? e.message : 'Could not save.'); }
    setBusy(false);
  };

  const remove = (id: string) => Alert.alert('Remove this entry?', 'It will be deleted from your log.', [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { try { await api(`/api/wellness/recovery?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); await load(); } catch { /* the list reloads on the next visit */ } } },
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">Recovery log</Text>
        <Text style={styles.para}>A few words about how your body feels after playing or training. One entry a day. Only you can see it.</Text>

        <View style={styles.card}>
          <Text style={styles.name}>Soreness today</Text>
          <View style={styles.scale}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setSoreness(n === soreness ? null : n)} accessibilityRole="button" accessibilityLabel={`Soreness ${n} of 5`} accessibilityState={{ selected: soreness === n }}
                style={[styles.dot, soreness === n && { backgroundColor: PINK, borderColor: PINK }]}><Text style={[styles.dotText, soreness === n && { color: '#04091A' }]}>{n}</Text></Pressable>
            ))}
          </View>
          <View style={styles.ends}><Text style={fonts.small}>Very sore</Text><Text style={fonts.small}>Fresh</Text></View>
          <TextInput value={activity} onChangeText={setActivity} placeholder="What did you do? (match, nets, gym…)" placeholderTextColor={colors.textSubtle} maxLength={200} style={styles.input} accessibilityLabel="Activity" />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor={colors.textSubtle} multiline maxLength={500} style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} accessibilityLabel="Notes" />
          <Pressable onPress={save} disabled={busy} accessibilityRole="button" style={[styles.btn, busy && { opacity: 0.4 }]}>{busy ? <ActivityIndicator color="#04091A" /> : <Text style={styles.btnText}>Save today</Text>}</Pressable>
          {note && <Text style={[fonts.small, { color: colors.white }]} accessibilityRole="alert">{note}</Text>}
        </View>

        <Text style={styles.section} accessibilityRole="header">Your entries</Text>
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!rows && !error && <ActivityIndicator color={PINK} />}
        {rows && rows.length === 0 && !error && <Text style={styles.para}>Nothing logged yet.</Text>}
        {rows?.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.name}>{prettyDate(r.date)}{r.soreness ? ` · soreness ${r.soreness}/5` : ''}</Text>
            {r.activity && <Text style={styles.para}>{r.activity}</Text>}
            {r.notes && <Text style={styles.para}>{r.notes}</Text>}
            <Pressable onPress={() => remove(r.id)} accessibilityRole="button"><Text style={[fonts.small, { color: colors.danger }]}>Remove</Text></Pressable>
          </View>
        ))}
        <Text style={fonts.small}>This is general guidance, not medical advice. For pain that is sharp, swelling or an injury, see a physio or your GP.</Text>
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
  input: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, color: colors.text, padding: spacing.md },
  btn: { backgroundColor: PINK, borderRadius: radius.pill, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
});
