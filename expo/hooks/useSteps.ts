import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { api, ApiError, type StepsSyncResponse } from '../lib/api';

export type StepsStatus = 'loading' | 'ready' | 'unavailable' | 'denied';

// Reads today's steps from the phone's motion coprocessor (iOS CoreMotion via expo-sensors) and
// syncs them to /api/steps/sync. Apple Health proper needs a native HealthKit module (e.g.
// react-native-health) in a development build; there is no "expo-health" package. Android's
// pedometer API has no step history, so it needs Health Connect and is reported as unavailable.
export function useSteps() {
  const [steps, setSteps] = useState(0);
  const [status, setStatus] = useState<StepsStatus>('loading');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<StepsSyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSynced = useRef(0);

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setStatus('unavailable');
      return;
    }
    try {
      if (!(await Pedometer.isAvailableAsync())) {
        setStatus('unavailable');
        return;
      }
      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        return;
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { steps: count } = await Pedometer.getStepCountAsync(start, new Date());
      setSteps(count);
      setStatus('ready');

      if (count >= 1 && count > lastSynced.current) {
        setSyncing(true);
        setError(null);
        try {
          // The server dates streaks in UTC, so send the UTC date
          const response = await api<StepsSyncResponse>('/api/steps/sync', {
            method: 'POST',
            body: { stepCount: count, logDate: new Date().toISOString().slice(0, 10), source: 'expo_sensors' },
          });
          lastSynced.current = count;
          setResult(response);
        } catch (e) {
          setError(e instanceof ApiError ? e.message : 'Could not sync your steps');
        } finally {
          setSyncing(false);
        }
      }
    } catch {
      setError('Could not read your steps');
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { steps, status, syncing, result, error, refresh };
}
