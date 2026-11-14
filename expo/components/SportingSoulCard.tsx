import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from './Card';
import { colors, fonts, radius, spacing } from '../constants/theme';

export function SportingSoulCard() {
  const router = useRouter();

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>SPORTING SOUL</Text>
      <Text style={fonts.title}>Your season, in words</Text>
      <Text style={[fonts.small, { marginTop: spacing.xs }]}>
        An AI-written story of your season, built from your real stats.
      </Text>
      <Pressable onPress={() => router.push('/sporting-soul')} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
        <Text style={styles.buttonText}>Read my story →</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.gold },
  label: { ...fonts.small, letterSpacing: 1, color: colors.gold, marginBottom: spacing.sm },
  button: { marginTop: spacing.lg, backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  buttonText: { color: colors.navy, fontWeight: '700' },
});
