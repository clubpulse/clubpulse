import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { api, ApiError } from '../lib/api';
import { colors, fonts, radius, spacing } from '../constants/theme';

const SHIELD_COST = 20;

// streakDay comes from the last steps sync. The shield spends Scores to keep a streak alive on a
// day with no steps; the server decides whether it's allowed.
export function StreakCard({ streakDay, onUsed }: { streakDay: number; onUsed: () => void }) {
  const [loading, setLoading] = useState(false);

  async function useShield() {
    setLoading(true);
    try {
      await api('/api/steps/streak-shield', { method: 'POST' });
      Alert.alert('Streak protected', 'Your streak is safe for today.');
      onUsed();
    } catch (e) {
      Alert.alert('Streak shield', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.flame}>{streakDay > 0 ? '🔥' : '💤'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={fonts.title}>{streakDay} day streak</Text>
          <Text style={fonts.small}>Hit your steps every day to keep it going</Text>
        </View>
      </View>
      <Pressable onPress={useShield} disabled={loading} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
        {loading ? <ActivityIndicator color={colors.gold} /> : <Text style={styles.buttonText}>🛡️ Use streak shield ({SHIELD_COST} Scores)</Text>}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flame: { fontSize: 32 },
  button: {
    marginTop: spacing.lg, borderWidth: 1, borderColor: colors.navyBorder, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  buttonText: { color: colors.text, fontWeight: '600' },
});
