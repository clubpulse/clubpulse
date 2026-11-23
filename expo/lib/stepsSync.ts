import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type StepsSyncResponse } from './api';
import { localDay, readSteps, type StepSource, type StepsAccess } from './health';
import { supabase } from './supabase';

// One sync routine shared by the Home screen (app open) and the background task (app closed).
//
// Yesterday is synced as well as today: some wearables (WHOOP, for one) only write a day's
// steps to the health store overnight, so yesterday's total can still rise the next morning.

export type SyncOutcome = {
  access: StepsAccess;
  /** Today's steps and where they came from */
  steps: number;
  source: StepSource | null;
  /** Server response for today, when today was sent in this run */
  today: StepsSyncResponse | null;
};

// Highest count already sent per user and local date, so an unchanged total is not re-sent.
// Persisted because the background task starts in a fresh JS runtime each time.
const SENT_KEY = 'shiftup.steps.sent';
type Sent = Record<string, number>;

async function loadSent(): Promise<Sent> {
  try {
    return JSON.parse((await AsyncStorage.getItem(SENT_KEY)) ?? '{}') as Sent;
  } catch {
    return {};
  }
}

let inFlight: Promise<SyncOutcome> | null = null;

// Resolved once the first on-screen sync has finished, which is when its permission sheet
// (if any) has been answered. Other prompts wait for this so two never stack up.
let markFirstSyncDone: () => void = () => {};
const firstSyncDone = new Promise<void>((resolve) => {
  markFirstSyncDone = resolve;
});

/** Waits for the first on-screen steps sync, or for the time limit if it never happens. */
export function afterFirstStepsSync(limitMs = 120_000): Promise<void> {
  return Promise.race([firstSyncDone, new Promise<void>((resolve) => setTimeout(resolve, limitMs))]);
}

/** Reads today's and yesterday's steps and sends whatever has gone up. Throws if a send fails. */
export function syncSteps(options: { interactive: boolean }): Promise<SyncOutcome> {
  // The screen and the background task can both fire as the app is opened; share one run
  inFlight ??= run(options).finally(() => {
    inFlight = null;
    if (options.interactive) markFirstSyncDone();
  });
  return inFlight;
}

async function run(options: { interactive: boolean }): Promise<SyncOutcome> {
  const today = localDay(0);
  const todayRead = await readSteps(today.start, today.end, options);
  const outcome: SyncOutcome = { access: todayRead.access, steps: todayRead.steps, source: todayRead.source, today: null };
  if (todayRead.access !== 'ready') return outcome;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return outcome;

  const yesterday = localDay(-1);
  const yesterdayRead = await readSteps(yesterday.start, yesterday.end, options);

  const sent = await loadSent();
  const key = (date: string) => `${userId}:${date}`;

  // Yesterday goes first: the server builds today's streak on yesterday's entry
  const days = [
    { day: yesterday, read: yesterdayRead, isToday: false },
    { day: today, read: todayRead, isToday: true },
  ].filter(({ day, read }) => read.access === 'ready' && read.steps >= 1 && read.steps > (sent[key(day.date)] ?? 0));

  for (const { day, read, isToday } of days) {
    // The date is the phone's local date, matching the window the steps were counted over
    const response = await api<StepsSyncResponse>('/api/steps/sync', {
      method: 'POST',
      body: { stepCount: read.steps, logDate: day.date, source: read.source },
    });
    if (isToday) outcome.today = response;

    // Keep only the two dates still in play so the record never grows
    const keep: Sent = { [key(day.date)]: read.steps };
    for (const d of [today.date, yesterday.date]) {
      if (d !== day.date && sent[key(d)] !== undefined) keep[key(d)] = sent[key(d)];
    }
    Object.keys(sent).forEach((k) => delete sent[k]);
    Object.assign(sent, keep);
    await AsyncStorage.setItem(SENT_KEY, JSON.stringify(sent)).catch(() => undefined);
  }

  return outcome;
}
