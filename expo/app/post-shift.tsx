// A club admin posts a volunteer shift. The server (POST /api/admin/shifts) checks it again
// and checks the caller runs a club.

import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../lib/api';
import { colors, fonts, radius, spacing } from '../constants/theme';

const ROLES = [
  { value: 'scorer', label: 'Scorer' },
  { value: 'umpire', label: 'Umpire' },
  { value: 'groundskeeper', label: 'Ground' },
  { value: 'tea_duty', label: 'Teas' },
  { value: 'first_aid', label: 'First aid' },
  { value: 'general', label: 'General help' },
] as const;

// The next three weeks, as tappable days. Dates are built from local parts so they do not
// slip a day in summer time.
function upcomingDays() {
  const days: { value: string; weekday: string; day: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 21; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      value,
      weekday: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
      day: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    });
  }
  return days;
}

/** Turns "930", "9.30" or "09:30" into "09:30"; null if it is not a time. */
function tidyTime(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  if (digits.length < 3 || digits.length > 4) return null;
  const hours = Number(digits.slice(0, digits.length - 2));
  const minutes = Number(digits.slice(-2));
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function PostShiftScreen() {
  const router = useRouter();
  const days = useMemo(upcomingDays, []);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]['value']>('general');
  const [date, setDate] = useState(days[0].value);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [needed, setNeeded] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3) return setError('Give the shift a title, such as "Scorer for the 2nd XI".');
    const startTime = tidyTime(start);
    const endTime = tidyTime(end);
    if (!startTime || !endTime) return setError('Enter the start and end times like 09:30 and 13:00.');
    if (endTime <= startTime) return setError('The shift has to end after it starts.');
    setSaving(true);
    try {
      await api('/api/admin/shifts', {
        method: 'POST',
        body: { title: title.trim(), role, shift_date: date, start_time: startTime, end_time: endTime, location: location.trim(), max_volunteers: needed },
      });
      setPosted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post the shift. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (posted) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.done}>
          <Text style={{ fontSize: 44 }}>✅</Text>
          <Text style={[fonts.heading, { textAlign: 'center' }]}>Shift posted</Text>
          <Text style={[fonts.small, { textAlign: 'center' }]}>Members can now see it on the Shifts tab and sign up.</Text>
          <Pressable style={styles.primary} onPress={() => { setPosted(false); setTitle(''); setStart(''); setEnd(''); }}>
            <Text style={styles.primaryText}>Post another</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={{ padding: spacing.md }}>
            <Text style={{ color: colors.brandSky, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>What needs doing</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Scorer for the 2nd XI" placeholderTextColor={colors.textSubtle} maxLength={80} />

          <Text style={styles.label}>Kind of shift</Text>
          <View style={styles.chips}>
            {ROLES.map((r) => (
              <Pressable key={r.value} onPress={() => setRole(r.value)} accessibilityRole="radio" accessibilityState={{ selected: role === r.value }}
                style={[styles.chip, role === r.value && styles.chipOn]}>
                <Text style={[styles.chipText, role === r.value && styles.chipTextOn]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {days.map((d) => (
              <Pressable key={d.value} onPress={() => setDate(d.value)} accessibilityRole="radio" accessibilityState={{ selected: date === d.value }}
                style={[styles.day, date === d.value && styles.chipOn]}>
                <Text style={[styles.dayTop, date === d.value && styles.chipTextOn]}>{d.weekday}</Text>
                <Text style={[styles.dayBottom, date === d.value && styles.chipTextOn]}>{d.day}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Starts</Text>
              <TextInput style={styles.input} value={start} onChangeText={setStart} onBlur={() => setStart((v) => tidyTime(v) ?? v)}
                placeholder="09:30" placeholderTextColor={colors.textSubtle} keyboardType="numbers-and-punctuation" maxLength={5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Ends</Text>
              <TextInput style={styles.input} value={end} onChangeText={setEnd} onBlur={() => setEnd((v) => tidyTime(v) ?? v)}
                placeholder="13:00" placeholderTextColor={colors.textSubtle} keyboardType="numbers-and-punctuation" maxLength={5} />
            </View>
          </View>

          <Text style={styles.label}>Where (optional)</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Main ground, scorebox" placeholderTextColor={colors.textSubtle} maxLength={120} />

          <Text style={styles.label}>Volunteers needed</Text>
          <View style={styles.stepper}>
            <Pressable onPress={() => setNeeded((n) => Math.max(1, n - 1))} style={styles.stepBtn} accessibilityLabel="One fewer volunteer">
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>{needed}</Text>
            <Pressable onPress={() => setNeeded((n) => Math.min(50, n + 1))} style={styles.stepBtn} accessibilityLabel="One more volunteer">
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.primary, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.primaryText}>Post shift</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: { color: colors.textMuted as string, fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.navyBorder, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.white, fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.navyBorder, backgroundColor: colors.surface1 },
  chipOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.textMuted as string, fontWeight: '600', fontSize: 14 },
  chipTextOn: { color: '#fff' },
  day: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, backgroundColor: colors.surface1, minWidth: 64 },
  dayTop: { color: colors.textMuted as string, fontSize: 12, fontWeight: '600' },
  dayBottom: { color: colors.white, fontSize: 14, fontWeight: '700', marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.navyBorder, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.white, fontSize: 22, fontWeight: '700' },
  stepValue: { color: colors.white, fontSize: 22, fontWeight: '800', minWidth: 30, textAlign: 'center' },
  error: { color: colors.danger, marginTop: spacing.lg, fontSize: 14 },
  primary: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xl, alignSelf: 'stretch' },
  primaryText: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
});
