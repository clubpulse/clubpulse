import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, fonts, radius, spacing } from '../constants/theme';
import type { StepsSyncResponse } from '../lib/api';
import type { StepsStatus } from '../hooks/useSteps';
import type { StepSource } from '../lib/health';

const GOAL = 10000;

type Props = {
  steps: number;
  source?: StepSource | null;
  status: StepsStatus;
  syncing: boolean;
  result: StepsSyncResponse | null;
  error: string | null;
  onSync: () => void;
};

export function StepsCard({ steps, source, status, syncing, result, error, onSync }: Props) {
  const progress = Math.min(1, steps / GOAL);

  return (
    <Card>
      <Text style={styles.label}>TODAY&apos;S STEPS</Text>

      {status === 'unavailable' && (
        <Text style={fonts.small}>
          {Platform.OS === 'android'
            ? 'Install or update Health Connect from Google Play to earn Scores for your steps.'
            : 'Step tracking isn\u2019t available on this device.'}
        </Text>
      )}
      {status === 'denied' && (
        <Text style={fonts.small}>
          {Platform.OS === 'android'
            ? 'Allow ShiftUp to read Steps in Health Connect to earn Scores for your steps.'
            : 'Allow Health or Motion access in Settings to earn Scores for your steps.'}
        </Text>
      )}
      {(status === 'ready' || status === 'loading') && (
        <>
          <Text style={fonts.big}>{steps.toLocaleString('en-GB')}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.hint}>
            {steps >= GOAL
              ? '10,000 reached: bonus Scores earned 🎉'
              : `${(GOAL - steps).toLocaleString('en-GB')} more for your ${GOAL.toLocaleString('en-GB')}-step bonus. You earn 1 Score per 1,000 steps.`}
          </Text>
          {source && (
            <Text style={styles.hint}>
              {source === 'apple_health'
                ? 'From Apple Health, including your watch and any apps that share steps with it.'
                : source === 'health_connect'
                  ? 'From Health Connect, including your watch and any apps that share steps with it.'
                  : 'From this iPhone only. Allow Apple Health to count your watch or wearable too.'}
            </Text>
          )}
          {Platform.OS === 'ios' && status === 'ready' && steps === 0 && !syncing && (
            <Text style={styles.hint}>
              Showing 0 after a walk? In the Health app go to your profile, then Apps, then ShiftUp, and turn on Steps.
            </Text>
          )}
          {result && !!result.totalScoresToday && (
            <Text style={styles.earned}>+{result.totalScoresToday} Scores earned today</Text>
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
