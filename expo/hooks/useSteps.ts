import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, ApiError, type StepsSyncResponse } from '../lib/api';
import { localDay, readSteps, type StepSource } from '../lib/health';

export type StepsStatus = 'loading' | 'ready' | 'unavailable' | 'denied';

// Reads steps from Apple Health when it is available (covering Apple Watch, WHOOP, Garmin and
// any other app that shares steps with Health) and otherwise from the phone's motion sensor,
// then syncs them to /api/steps/sync. See lib/health.ts for how the sources are combined.
//
// Yesterday is synced as well as today: some wearables (WHOOP, for one) only write a day's
// steps to Health overnight, so yesterday's total can still rise the next morning.
export function useSteps() {
  const [steps, setSteps] = useState(0);
  const [source, setSource] = useState<StepSource | null>(null);
  const [status, setStatus] = useState<StepsStatus>('loading');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<StepsSyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Highest count already sent for each local date, so an unchanged total is not re-sent
  const lastSynced = useRef<Record<string, number>>({});
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const today = localDay(0);
      const todayRead = await readSteps(today.start, today.end);
      setStatus(todayRead.access);
      if (todayRead.access !== 'ready') return;
      setSteps(todayRead.steps);
      setSource(todayRead.source);

      const yesterday = localDay(-1);
      const yesterdayRead = await readSteps(yesterday.start, yesterday.end);

      // Yesterday goes first: the server builds today's streak on yesterday's entry
      const days = [
        { day: yesterday, read: yesterdayRead, isToday: false },
        { day: today, read: todayRead, isToday: true },
      ].filter(({ day, read }) => read.steps >= 1 && read.steps > (lastSynced.current[day.date] ?? 0));
      if (days.length === 0) return;

      setSyncing(true);
      setError(null);
      try {
        for (const { day, read, isToday } of days) {
          // The date is the phone's local date, matching the window the steps were counted over
          const response = await api<StepsSyncResponse>('/api/steps/sync', {
            method: 'POST',
            body: { stepCount: read.steps, logDate: day.date, source: read.source },
          });
          lastSynced.current[day.date] = read.steps;
          if (isToday) setResult(response);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not sync your steps');
      } finally {
        setSyncing(false);
      }
    } catch {
      setError('Could not read your steps');
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { steps, source, status, syncing, result, error, refresh };
}
