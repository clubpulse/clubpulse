// One Warm-Up item. A guided session plays its steps on a timer with a breathing circle; a read
// shows its paragraphs and takeaways; a checklist can be ticked; tips are a short list.
//
// Finishing a guided session, or a week of Mind Nets, counts towards the Run Chase tasks. For
// that the app tells SHIFTUP only that a session was done today, never which one.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { itemById, type Guided, type Week } from '../../../lib/warmup';
import { getDoneWeeks, setWeekDone } from '../../../lib/warmupStore';
import { useReducedMotion } from '../../../components/Magic';
import { api } from '../../../lib/api';
import { colors, display, fonts, radius, spacing } from '../../../constants/theme';

const PINK = '#F472B6';

export default function WarmupItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const found = itemById(id ?? '');

  useEffect(() => { if (found) navigation.setOptions({ title: found.section.title }); }, [navigation, found]);
  if (!found) return <SafeAreaView style={styles.safe}><Text style={[fonts.small, { padding: spacing.lg }]}>This page was not found.</Text></SafeAreaView>;
  const { item } = found;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">{item.title}</Text>
        <Text style={styles.summary}>{item.summary}</Text>

        {item.kind === 'guided' && <Player item={item} />}

        {item.kind === 'read' && (
          <>
            {item.paragraphs.map((p, i) => <Text key={i} style={styles.para}>{p}</Text>)}
            <View style={styles.box}>
              <Text style={styles.eyebrow}>TAKE THIS WITH YOU</Text>
              {item.points.map((p) => <View key={p} style={styles.point}><Text style={styles.dot}>•</Text><Text style={styles.pointText}>{p}</Text></View>)}
            </View>
          </>
        )}

        {item.kind === 'week' && <WeekView item={item} />}

        {item.kind === 'checklist' && <Ticks intro={item.intro} items={item.items} />}

        {item.kind === 'tips' && item.tips.map((t, i) => (
          <View key={t} style={styles.tip}><Text style={styles.tipNumber}>{i + 1}</Text><Text style={styles.pointText}>{t}</Text></View>
        ))}

        <Text style={styles.note}>This is preparation for sport, not medical advice.</Text>
        <Pressable onPress={() => router.push('/warmup/support')} accessibilityRole="button" style={styles.support}>
          <Text style={styles.supportText}>Finding things hard? Talk to someone</Text>
          <Ionicons name="chevron-forward" size={16} color={PINK} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function WeekView({ item }: { item: Week }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  useEffect(() => { getDoneWeeks().then((list) => setDone(list.includes(item.id))); }, [item.id]);

  const toggle = async () => {
    const list = await setWeekDone(item.id, !done);
    setDone(list.includes(item.id));
    // Counts towards the weekly and monthly Run Chase tasks
    if (!done) api('/api/rewards/activity', { method: 'POST', body: { kind: 'mind_week', week: item.week } }).catch(() => {});
  };
  const openDaily = () => {
    if (item.daily.route) router.push(item.daily.route as never);
    else if (item.daily.id) router.push({ pathname: '/warmup/item/[id]', params: { id: item.daily.id } });
  };

  return (
    <>
      <Text style={styles.eyebrow}>THIS WEEK'S SKILL · {item.skill.toUpperCase()}</Text>
      {item.learn.map((p, i) => <Text key={i} style={styles.para}>{p}</Text>)}

      <View style={styles.box}>
        <Text style={styles.eyebrow}>AT THE NETS</Text>
        <Text style={styles.drillTitle}>{item.drill.title}</Text>
        {item.drill.steps.map((step, i) => <View key={step} style={styles.point}><Text style={styles.dot}>{i + 1}.</Text><Text style={styles.pointText}>{step}</Text></View>)}
      </View>

      <Pressable onPress={openDaily} accessibilityRole="button" style={styles.daily}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>EVERY DAY THIS WEEK</Text>
          <Text style={styles.drillTitle}>{item.daily.label}</Text>
        </View>
        <Ionicons name="play-circle" size={32} color={PINK} />
      </Pressable>

      <View style={styles.box}>
        <Text style={styles.eyebrow}>AT THE END OF THE WEEK, ASK YOURSELF</Text>
        <Text style={styles.para}>{item.check}</Text>
      </View>

      <Pressable onPress={toggle} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={[styles.tick, done && { borderColor: PINK, backgroundColor: 'rgba(244,114,182,0.10)' }]}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? PINK : (colors.textMuted as string)} />
        <Text style={[styles.pointText, { color: colors.white, fontWeight: '700' }]}>{done ? `Week ${item.week} done` : `Mark week ${item.week} as done`}</Text>
      </Pressable>
      <Text style={styles.earn}>⭐ Finishing a week counts towards your Run Chase tasks.</Text>
    </>
  );
}

function Ticks({ intro, items }: { intro: string; items: string[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  return (
    <>
      <Text style={styles.para}>{intro}</Text>
      {items.map((text, i) => {
        const on = done.has(i);
        return (
          <Pressable key={text} onPress={() => setDone((d) => { const n = new Set(d); if (on) n.delete(i); else n.add(i); return n; })}
            accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.tick, on && { borderColor: PINK, backgroundColor: 'rgba(244,114,182,0.10)' }]}>
            <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? PINK : (colors.textMuted as string)} />
            <Text style={[styles.pointText, on && { color: colors.white }]}>{text}</Text>
          </Pressable>
        );
      })}
      <Text style={fonts.small}>{done.size} of {items.length} done</Text>
    </>
  );
}

function Player({ item }: { item: Guided }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(item.steps[0].seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const step = item.steps[index];
  const total = item.steps.reduce((sum, s) => sum + s.seconds, 0);
  const gone = item.steps.slice(0, index).reduce((sum, s) => sum + s.seconds, 0) + (step.seconds - left);

  // One tick a second while playing; at zero, move to the next step or finish
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      if (left > 1) return setLeft(left - 1);
      if (index + 1 < item.steps.length) { setIndex(index + 1); setLeft(item.steps[index + 1].seconds); }
      else { setRunning(false); setFinished(true); setLeft(0); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [running, left, index, item.steps]);

  // A finished session counts towards today's Run Chase. Only "a session was done" is sent.
  useEffect(() => {
    if (finished) api('/api/rewards/activity', { method: 'POST', body: { kind: 'warmup' } }).catch(() => {});
  }, [finished]);

  // The circle grows on the breath in and shrinks on the breath out, taking the whole step
  useEffect(() => {
    if (!running || reduced || !step.breathe || step.breathe === 'hold') return;
    const animation = Animated.timing(scale, { toValue: step.breathe === 'in' ? 1.35 : 1, duration: step.seconds * 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [index, running, reduced, scale, step.breathe, step.seconds]);

  const restart = () => { setIndex(0); setLeft(item.steps[0].seconds); setFinished(false); setRunning(true); scale.setValue(1); };
  const skip = () => {
    if (index + 1 < item.steps.length) { setIndex(index + 1); setLeft(item.steps[index + 1].seconds); }
    else { setRunning(false); setFinished(true); setLeft(0); }
  };

  return (
    <View style={styles.player}>
      <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
        <Text style={styles.count} accessibilityLabel={finished ? 'Finished' : `${left} seconds`}>{finished ? '✓' : left}</Text>
      </Animated.View>
      <Text style={styles.say} accessibilityLiveRegion="polite">{finished ? 'Done. Take that with you.' : step.say}</Text>

      <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (gone / total) * 100)}%` }]} /></View>
      <Text style={fonts.small}>{finished ? `${item.minutes} min session complete` : `Step ${index + 1} of ${item.steps.length}`}</Text>
      {finished && <Text style={styles.earn}>⭐ Counted towards today's Run Chase.</Text>}

      <View style={styles.controls}>
        {finished ? (
          <Pressable onPress={restart} accessibilityRole="button" style={styles.primary}><Ionicons name="refresh" size={20} color="#04091A" /><Text style={styles.primaryText}>Again</Text></Pressable>
        ) : (
          <>
            <Pressable onPress={() => setRunning(!running)} accessibilityRole="button" style={styles.primary}>
              <Ionicons name={running ? 'pause' : 'play'} size={20} color="#04091A" />
              <Text style={styles.primaryText}>{running ? 'Pause' : index === 0 && left === item.steps[0].seconds ? 'Start' : 'Carry on'}</Text>
            </Pressable>
            <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Next step" style={styles.ghost}><Ionicons name="play-skip-forward" size={20} color={colors.white} /></Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: display.heavy, fontSize: 26, lineHeight: 32, color: colors.white, letterSpacing: -0.4 },
  summary: { fontSize: 15, lineHeight: 22, color: colors.textMuted as string },
  para: { fontSize: 16, lineHeight: 25, color: colors.text },
  box: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(244,114,182,0.4)', backgroundColor: 'rgba(244,114,182,0.08)', padding: spacing.lg, gap: spacing.sm },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: PINK },
  point: { flexDirection: 'row', gap: spacing.sm },
  dot: { color: PINK, fontSize: 16, lineHeight: 22, minWidth: 14 },
  drillTitle: { fontFamily: display.bold, fontSize: 17, color: colors.white },
  daily: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(244,114,182,0.45)', padding: spacing.lg },
  pointText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
  tip: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  tipNumber: { fontFamily: display.heavy, fontSize: 18, color: PINK, width: 22 },
  tick: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', minHeight: 56, backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  earn: { fontSize: 13, fontWeight: '600', color: colors.gold, textAlign: 'center' },
  note: { fontSize: 12.5, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.md },
  support: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(244,114,182,0.45)' },
  supportText: { fontSize: 14, fontWeight: '600', color: colors.white },
  player: { alignItems: 'center', gap: spacing.md, backgroundColor: colors.navyLight, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(244,114,182,0.3)', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  circle: { width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(244,114,182,0.18)', borderWidth: 2, borderColor: PINK, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg },
  count: { fontFamily: display.heavy, fontSize: 44, color: colors.white },
  say: { fontSize: 18, lineHeight: 26, color: colors.white, textAlign: 'center', minHeight: 78, fontWeight: '600' },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: 6, backgroundColor: PINK },
  controls: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PINK, borderRadius: radius.pill, paddingHorizontal: 28, minHeight: 52 },
  primaryText: { color: '#04091A', fontWeight: '800', fontSize: 16 },
  ghost: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
