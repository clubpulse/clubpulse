import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, type StepsSyncResponse } from '../lib/api';
import type { StepSource } from '../lib/health';
import { syncSteps } from '../lib/stepsSync';

export type StepsStatus = 'loading' | 'ready' | 'unavailable' | 'denied';

// Shows today's steps and syncs them whenever the app is opened or brought forward.
// Steps come from Apple Health on iPhone and Health Connect on Android, which cover watches
// and wearable apps (see lib/health.ts). The same sync also runs in the background
// (lib/backgroundSync.ts).
export function useSteps() {
  const [steps, setSteps] = useState(0);
  const [source, setSource] = useState<StepSource | null>(null);
  const [status, setStatus] = useState<StepsStatus>('loading');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<StepsSyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const outcome = await syncSteps({ interactive: true });
      setStatus(outcome.access);
      if (outcome.access === 'ready') {
        setSteps(outcome.steps);
        setSource(outcome.source);
        if (outcome.today) setResult(outcome.today);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sync your steps');
    } finally {
      setSyncing(false);
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
