import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { api, ApiError } from '../lib/api';
import { CONSENTS } from '../lib/consents';
import { colors, fonts, radius, spacing } from '../constants/theme';

// A parent adds a child to their club. The server (POST /api/juniors) re-checks everything
// here and links the parent to the new record; a club admin then verifies the link.

const RELATIONSHIPS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'carer', label: 'Carer' },
] as const;

const GENDERS = [
  { value: 'female', label: 'Girl' },
  { value: 'male', label: 'Boy' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

/** 'YYYY-MM-DD' for a real past date of someone under 18, or a message saying what's wrong. */
function readDateOfBirth(day: string, month: string, year: string): { date: string } | { error: string } {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!day || !month || year.length !== 4 || !Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) {
    return { error: 'Enter the date of birth as day, month and four-digit year.' };
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { error: 'That date of birth doesn’t exist.' };
  }
  const now = new Date();
  if (date.getTime() > now.getTime()) return { error: 'The date of birth can’t be in the future.' };
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  if (age >= 18) return { error: 'Only under-18s can be added as a child.' };
  return { date: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

export default function RegisterChildScreen() {
  const router = useRouter();
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<string>('parent');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);

  async function submit() {
    if (!firstName.trim() || !lastName.trim()) return setError('Enter your child’s first and last name.');
    const dob = readDateOfBirth(day, month, year);
    if ('error' in dob) return setError(dob.error);

    setSaving(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>('/api/juniors', {
        method: 'POST',
        body: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob.date,
          gender,
          relationship,
          emergency_contact_name: contactName || null,
          emergency_contact_phone: contactPhone || null,
          medical_notes: medicalNotes || null,
          consents: CONSENTS.filter((c) => consents[c.type]).map((c) => c.type),
        },
      });
      // Replace, so Back from the child's screen doesn't return to a filled-in form
      router.replace({ pathname: '/junior/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add your child. Check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Add a child',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={fonts.small}>
            Add a child you are responsible for. Your club will check the details before the link is confirmed.
          </Text>

          <Text style={styles.sectionLabel}>CHILD</Text>
          <TextInput
            value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.textMuted}
            autoCapitalize="words" autoComplete="off" maxLength={60} style={styles.input}
          />
          <TextInput
            value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={colors.textMuted}
            autoCapitalize="words" autoComplete="off" maxLength={60} style={styles.input}
          />

          <Text style={fonts.regular}>Date of birth</Text>
          <View style={styles.row}>
            <TextInput
              value={day}
              onChangeText={(v) => { const next = digits(v, 2); setDay(next); if (next.length === 2) monthRef.current?.focus(); }}
              placeholder="DD" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={[styles.input, styles.dateShort]}
              accessibilityLabel="Day of birth"
            />
            <TextInput
              ref={monthRef} value={month}
              onChangeText={(v) => { const next = digits(v, 2); setMonth(next); if (next.length === 2) yearRef.current?.focus(); }}
              placeholder="MM" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={[styles.input, styles.dateShort]}
              accessibilityLabel="Month of birth"
            />
            <TextInput
              ref={yearRef} value={year} onChangeText={(v) => setYear(digits(v, 4))}
              placeholder="YYYY" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={[styles.input, styles.dateLong]}
              accessibilityLabel="Year of birth"
            />
          </View>

          <Text style={fonts.regular}>Gender (optional)</Text>
          <Choices options={GENDERS} value={gender} onChange={(v) => setGender(v === gender ? null : v)} />

          <Text style={fonts.regular}>You are their</Text>
          <Choices options={RELATIONSHIPS} value={relationship} onChange={setRelationship} />

          <Text style={styles.sectionLabel}>EMERGENCY CONTACT</Text>
          <TextInput
            value={contactName} onChangeText={setContactName} placeholder="Name" placeholderTextColor={colors.textMuted}
            autoCapitalize="words" maxLength={100} style={styles.input}
          />
          <TextInput
            value={contactPhone} onChangeText={setContactPhone} placeholder="Phone number" placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad" maxLength={20} style={styles.input}
          />

          <Text style={styles.sectionLabel}>MEDICAL NOTES (OPTIONAL)</Text>
          <TextInput
            value={medicalNotes} onChangeText={setMedicalNotes} multiline maxLength={1000}
            placeholder="Allergies, conditions or anything coaches should know" placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.notes]}
          />

          <Text style={styles.sectionLabel}>CONSENTS</Text>
          <View style={styles.card}>
            {CONSENTS.map((c, index) => (
              <View key={c.type} style={[styles.consentRow, index > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={fonts.regular}>{c.label}</Text>
                  <Text style={fonts.small}>{c.detail}</Text>
                </View>
                <Switch
                  value={!!consents[c.type]}
                  onValueChange={(value) => setConsents((current) => ({ ...current, [c.type]: value }))}
                  trackColor={{ true: colors.success, false: colors.navyBorder }}
                />
              </View>
            ))}
          </View>
          <Text style={fonts.small}>
            Each consent is your choice and you can change it at any time from your child&apos;s screen.
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={submit} disabled={saving} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
            {saving ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Add child</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: string | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(232,237,245,0.4)', letterSpacing: 0.5, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface1, color: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border as string, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 16,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  dateShort: { width: 72, textAlign: 'center' },
  dateLong: { width: 100, textAlign: 'center' },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill,
    backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border as string,
  },
  choiceSelected: { backgroundColor: colors.brandPrimaryDim, borderColor: colors.brandPrimary },
  choiceText: { color: colors.textMuted as string, fontSize: 14, fontWeight: '500' },
  choiceTextSelected: { color: colors.brandSky },
  card: {
    backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border as string, paddingHorizontal: spacing.md,
  },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border as string },
  error: { color: colors.danger },
  button: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: colors.navy, fontWeight: '700', fontSize: 16 },
});
