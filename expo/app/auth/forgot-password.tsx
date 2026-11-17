import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const address = email.trim();
    if (!address) return;
    setLoading(true);
    setError(null);
    // The link in the email opens the app on the reset-password screen.
    // clubpulse://reset-password must be listed under Redirect URLs in Supabase Auth settings.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: Linking.createURL('/reset-password'),
    });
    setLoading(false);
    if (resetError) setError(resetError.message);
    else setSent(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={[fonts.heading, { textAlign: 'center' }]}>Reset your password</Text>

        {sent ? (
          <Text style={[fonts.regular, { textAlign: 'center' }]}>
            If an account exists for {email.trim()}, a reset link is on its way. Open it on this phone to choose a
            new password.
          </Text>
        ) : (
          <>
            <Text style={[fonts.small, { textAlign: 'center', marginBottom: spacing.md }]}>
              Enter your email and we&apos;ll send you a link to choose a new one.
            </Text>
            <TextInput
              value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textMuted}
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" autoCorrect={false} spellCheck={false} style={styles.input}
              onSubmitEditing={submit} returnKeyType="send"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable onPress={submit} disabled={loading} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
              {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Send reset link</Text>}
            </Pressable>
          </>
        )}

        <Link href="/auth/sign-in" style={styles.back}>Back to sign in</Link>
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
  back: { color: colors.brandSky, textAlign: 'center', marginTop: spacing.lg, fontSize: 14 },
});
