import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/Card';
import { api, ApiError, type SportingSoul } from '../lib/api';
import { colors, fonts, radius, spacing } from '../constants/theme';

export default function SportingSoulScreen() {
  const router = useRouter();
  const [soul, setSoul] = useState<SportingSoul | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setSoul(await api<SportingSoul>('/api/ai/sporting-soul', { method: 'POST' }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not write your story');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.gold }}>← Back</Text></Pressable>
        <Text style={fonts.heading}>Sporting Soul</Text>

        {!soul && (
          <Text style={fonts.small}>
            Your season, told as a story. It uses your real stats, so the more you log, the better it gets.
          </Text>
        )}

        {soul && (
          <>
            <Card style={{ borderColor: colors.gold }}>
              <Text style={styles.headline}>{soul.headline}</Text>
              <Text style={styles.achievement}>{soul.achievement}</Text>
            </Card>
            <Text style={styles.narrative}>{soul.narrative}</Text>
            <Card>
              <Text style={[fonts.small, { color: colors.gold, letterSpacing: 1 }]}>YOUR REWARD</Text>
              <Text style={[fonts.regular, { marginTop: spacing.xs }]}>{soul.rewardTrigger}</Text>
            </Card>
          </>
        )}

        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <Pressable onPress={generate} disabled={loading} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
          {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>{soul ? 'Write it again' : 'Write my story'}</Text>}
        </Pressable>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  headline: { color: colors.gold, fontSize: 26, fontWeight: '800' },
  achievement: { ...fonts.regular, marginTop: spacing.sm },
  narrative: { ...fonts.regular, lineHeight: 24 },
  button: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center' },
  buttonText: { color: colors.navy, fontWeight: '700', fontSize: 16 },
});
