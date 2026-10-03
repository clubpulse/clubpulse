import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Could not sign in', error);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.logo}>ClubPulse</Text>
        <Text style={[fonts.small, { textAlign: 'center', marginBottom: spacing.xl }]}>Sign in to stack your Scores</Text>

        <TextInput
          value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textMuted}
          autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input}
        />
        <TextInput
          value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.textMuted}
          secureTextEntry autoComplete="current-password" style={styles.input}
        />

        <Pressable onPress={submit} disabled={loading} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
          {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={fonts.small}>New to ClubPulse? </Text>
          <Link href="/auth/sign-up" style={{ color: colors.gold, fontWeight: '600' }}>Create an account</Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  logo: { color: colors.white, fontSize: 40, fontWeight: '800', textAlign: 'center' },
  input: {
    backgroundColor: colors.navyLight, color: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.navyBorder, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, fontSize: 16,
  },
  button: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: colors.navy, fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
});
