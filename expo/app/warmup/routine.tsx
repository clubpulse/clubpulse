// My Routine: build the few seconds you repeat before every ball. Four parts: a breath, somewhere
// to look, a word and a trigger movement. Saved on this phone only.

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EMPTY_ROUTINE, getRoutine, saveRoutine, type Routine } from '../../lib/warmupStore';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

const PINK = '#F472B6';

const PARTS: Array<{ key: keyof Routine; title: string; why: string; ideas: string[] }> = [
  { key: 'breath', title: '1. Breath', why: 'Lets the last ball go.', ideas: ['One slow breath out', 'In for four, out for six', 'Two normal breaths'] },
  { key: 'look', title: '2. Look', why: 'Rests your eyes, then narrows them.', ideas: ['Up at the sky, then the bowler\'s hand', 'The sightscreen, then the seam', 'My mark, then the top of off stump'] },
  { key: 'word', title: '3. Word', why: 'An instruction, not a judgement.', ideas: ['Watch the ball', 'Head still', 'Hit the length', 'Smooth'] },
  { key: 'trigger', title: '4. Trigger', why: 'The small movement that means "now".', ideas: ['Tap the bat twice', 'Touch my cap', 'Spin the ball in my hand', 'Tug my glove'] },
];

export default function RoutineScreen() {
  const [routine, setRoutine] = useState<Routine>(EMPTY_ROUTINE);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { getRoutine().then(setRoutine); }, []);

  const set = (key: keyof Routine, value: string) => { setRoutine((r) => ({ ...r, [key]: value })); setNote(null); };
  const save = async () => {
    try { await saveRoutine(routine); setNote('Saved on this phone. Use it before every ball this week.'); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not save.'); }
  };
  const filled = PARTS.filter((p) => routine[p.key].trim()).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">My Routine</Text>
        <Text style={styles.para}>The few seconds you repeat before every ball. Under ten seconds, the same on good days and bad. Tap an idea or write your own.</Text>

        {filled === 4 && (
          <View style={styles.summary}>
            <Text style={styles.eyebrow}>BEFORE EVERY BALL</Text>
            {PARTS.map((p) => <Text key={p.key} style={styles.line}>{routine[p.key]}</Text>)}
          </View>
        )}

        {PARTS.map((part) => (
          <View key={part.key} style={styles.card}>
            <Text style={styles.partTitle}>{part.title}</Text>
            <Text style={fonts.small}>{part.why}</Text>
            <TextInput value={routine[part.key]} onChangeText={(v) => set(part.key, v)} maxLength={60} placeholder={part.ideas[0]} placeholderTextColor={colors.textSubtle} style={styles.input} accessibilityLabel={part.title} />
            <View style={styles.ideas}>
              {part.ideas.map((idea) => (
                <Pressable key={idea} onPress={() => set(part.key, idea)} accessibilityRole="button" style={[styles.idea, routine[part.key] === idea && { backgroundColor: PINK, borderColor: PINK }]}>
                  <Text style={[styles.ideaText, routine[part.key] === idea && { color: '#04091A' }]}>{idea}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {note && <Text style={[fonts.small, { color: colors.white }]} accessibilityRole="alert">{note}</Text>}
        <Pressable onPress={save} accessibilityRole="button" style={styles.btn}><Text style={styles.btnText}>Save my routine</Text></Pressable>
        <Text style={[fonts.small, { textAlign: 'center' }]}>Kept on this phone only.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: display.heavy, fontSize: 26, color: colors.white },
  para: { fontSize: 15, lineHeight: 23, color: colors.text },
  summary: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(244,114,182,0.45)', backgroundColor: 'rgba(244,114,182,0.10)', padding: spacing.lg, gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: PINK },
  line: { fontFamily: display.bold, fontSize: 16, lineHeight: 23, color: colors.white },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  partTitle: { fontFamily: display.bold, fontSize: 17, color: colors.white },
  input: { color: colors.white, fontSize: 15, minHeight: 46, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  idea: { paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)' },
  ideaText: { fontSize: 13, fontWeight: '600', color: colors.text },
  btn: { backgroundColor: PINK, borderRadius: radius.pill, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 16 },
});
