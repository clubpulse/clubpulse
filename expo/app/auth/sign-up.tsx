import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      Alert.alert('Check your details', 'Enter your name, email and a password of at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email.trim(), password, fullName);
    setLoading(false);

    if (error) {
      Alert.alert('Could not create account', error);
      return;
    }
    if (needsConfirmation) {
      Alert.alert('Check your email', 'We sent you a link to confirm your account. Confirm it, then sign in here.');
      router.replace('/auth/sign-in');
    }
    // Otherwise a session now exists and the root layout moves us into the app
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>Creds</Text>
          <Text style={[fonts.small, { textAlign: 'center', marginBottom: spacing.xl }]}>Create your account</Text>

          <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor={colors.textMuted}
            autoComplete="name" style={styles.input} />
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" placeholderTextColor={colors.textMuted}
            secureTextEntry autoComplete="new-password" style={styles.input} />

          <Pressable onPress={submit} disabled={loading} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
            {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Create account</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Text style={fonts.small}>Already have an account? </Text>
            <Link href="/auth/sign-in" style={{ color: colors.gold, fontWeight: '600' }}>Sign in</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  logo: { color: colors.white, fontSize: 40, fontWeight: '800', textAlign: 'center' },
  input: {
    backgroundColor: colors.navyLight, color: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.navyBorder, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, fontSize: 16,
  },
  button: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: colors.navy, fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
});
