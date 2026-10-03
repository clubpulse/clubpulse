import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, fonts, radius, spacing } from '../constants/theme';
import type { StepsSyncResponse } from '../lib/api';
import type { StepsStatus } from '../hooks/useSteps';

const GOAL = 10000;

type Props = {
  steps: number;
  status: StepsStatus;
  syncing: boolean;
  result: StepsSyncResponse | null;
  error: string | null;
  onSync: () => void;
};

export function StepsCard({ steps, status, syncing, result, error, onSync }: Props) {
  const progress = Math.min(1, steps / GOAL);

  return (
    <Card>
      <Text style={styles.label}>TODAY&apos;S STEPS</Text>

      {status === 'unavailable' && (
        <Text style={fonts.small}>Step tracking isn&apos;t available on this device yet.</Text>
      )}
      {status === 'denied' && (
        <Text style={fonts.small}>Allow motion access in Settings to earn Creds for your steps.</Text>
      )}
      {(status === 'ready' || status === 'loading') && (
        <>
          <Text style={fonts.big}>{steps.toLocaleString('en-GB')}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.hint}>
            {steps >= GOAL ? `Daily goal reached 🎉` : `${(GOAL - steps).toLocaleString('en-GB')} to your ${GOAL.toLocaleString('en-GB')} goal`}
          </Text>
          {result && !!result.totalCredsToday && (
            <Text style={styles.earned}>+{result.totalCredsToday} Creds earned today</Text>
          )}
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {status !== 'unavailable' && (
        <Pressable onPress={onSync} disabled={syncing} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
          {syncing ? <ActivityIndicator color={colors.gold} /> : <Text style={styles.buttonText}>Sync now</Text>}
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { ...fonts.small, letterSpacing: 1, marginBottom: spacing.sm },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.navyBorder, overflow: 'hidden', marginTop: spacing.md },
  fill: { height: '100%', backgroundColor: colors.gold, borderRadius: radius.pill },
  hint: { ...fonts.small, marginTop: spacing.sm },
  earned: { color: colors.success, fontWeight: '600', marginTop: spacing.sm },
  error: { color: colors.danger, marginTop: spacing.sm },
  button: {
    marginTop: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  buttonText: { color: colors.gold, fontWeight: '600' },
});
