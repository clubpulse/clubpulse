import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, spacing } from '../constants/theme';

const MIN_LENGTH = 8;

type Stage = 'checking' | 'ready' | 'invalid' | 'done';

// Supabase puts the recovery session (or an error) after the # in the emailed link, e.g.
// clubpulse://reset-password#access_token=…&refresh_token=…&type=recovery
function linkParams(url: string): URLSearchParams {
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  return new URLSearchParams([hash, query].filter(Boolean).join('&'));
}

// Opened from the link in the password reset email. The link signs the person in with a
// short-lived recovery session, which is what allows the password to be changed here.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const handled = useRef<string | null>(null);
  const [stage, setStage] = useState<Stage>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;

    const params = linkParams(url);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken || params.get('type') !== 'recovery') {
      // Expired or already-used links arrive with error_description instead of tokens
      setStage('invalid');
      return;
    }
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => setStage(sessionError ? 'invalid' : 'ready'));
  }, [url]);

  // Opened without a link at all (e.g. typed route): don't sit on the spinner forever
  useEffect(() => {
    const timer = setTimeout(() => setStage((s) => (s === 'checking' ? 'invalid' : s)), 4000);
    return () => clearTimeout(timer);
  }, []);

  async function save() {
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError('The two passwords don’t match.');
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) setError(updateError.message);
    else setStage('done');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={[fonts.heading, { textAlign: 'center' }]}>Choose a new password</Text>

        {stage === 'checking' && <ActivityIndicator color={colors.gold} />}

        {stage === 'invalid' && (
          <>
            <Text style={[fonts.regular, { textAlign: 'center' }]}>
              This reset link has expired or has already been used. Request a new one and open it on this phone.
            </Text>
            <Pressable onPress={() => router.replace('/auth/forgot-password')} style={styles.button}>
              <Text style={styles.buttonText}>Send a new link</Text>
            </Pressable>
          </>
        )}

        {stage === 'ready' && (
          <>
            <TextInput
              value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={colors.textMuted}
              secureTextEntry autoComplete="new-password" style={styles.input}
            />
            <TextInput
              value={confirm} onChangeText={setConfirm} placeholder="Repeat new password" placeholderTextColor={colors.textMuted}
              secureTextEntry autoComplete="new-password" style={styles.input} onSubmitEditing={save} returnKeyType="done"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable onPress={save} disabled={saving} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
              {saving ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Save password</Text>}
            </Pressable>
          </>
        )}

        {stage === 'done' && (
          <>
            <Text style={[fonts.regular, { textAlign: 'center' }]}>Your password has been changed and you&apos;re signed in.</Text>
            <Pressable onPress={() => router.replace('/')} style={styles.button}>
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  input: {
    backgroundColor: colors.navyLight, color: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.navyBorder, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, fontSize: 16,
  },
  button: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: colors.navy, fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, textAlign: 'center' },
});
