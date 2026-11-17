import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';

// Step sources, best first:
//  iOS
//   1. Apple Health (HealthKit): the user's combined step total from every source they share
//      with Health, e.g. iPhone, Apple Watch, WHOOP, Garmin, Oura, Fitbit.
//   2. The iPhone's own motion sensor (expo-sensors), used when Health is unavailable or the
//      user has not allowed it.
//  Android
//   1. Health Connect: the combined total from every app that writes steps to it, e.g.
//      Fitbit, Samsung Health, Garmin, WHOOP, Google Fit. There is no sensor fallback,
//      because Android's pedometer API keeps no step history.
// Both health stores need a development or production build; neither is in Expo Go.

export type StepSource = 'apple_health' | 'health_connect' | 'expo_sensors';
export type StepsAccess = 'ready' | 'unavailable' | 'denied';

export type StepsRead = { access: StepsAccess; steps: number; source: StepSource };

/**
 * interactive: true when the user has the app open, so permission sheets may be shown.
 * The background task passes false and only reads what has already been allowed.
 */
export type ReadOptions = { interactive: boolean };

const ASKED_KEY = 'clubpulse.health.asked';

async function hasAsked(): Promise<boolean> {
  return (await AsyncStorage.getItem(ASKED_KEY).catch(() => null)) === '1';
}
async function markAsked(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
}

/* ── iOS: Apple Health ─────────────────────────────────────────────────────── */

type HealthKit = typeof import('@kingstinct/react-native-healthkit');

const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount' as const;

let healthKit: HealthKit | null | undefined;

// Loaded lazily so a build without the native module (Expo Go) falls back to the motion sensor
function loadHealthKit(): HealthKit | null {
  if (healthKit !== undefined) return healthKit;
  try {
    const mod = require('@kingstinct/react-native-healthkit') as HealthKit;
    healthKit = mod.isHealthDataAvailable() ? mod : null;
  } catch {
    healthKit = null;
  }
  return healthKit;
}

/** Shows the Apple Health permission sheet the first time; iOS makes it a no-op after that. */
async function ensureHealthAccess(hk: HealthKit, { interactive }: ReadOptions): Promise<boolean> {
  if (!interactive) return hasAsked();
  try {
    await hk.requestAuthorization({ toRead: [STEP_COUNT] });
    await markAsked();
    return true;
  } catch {
    return false;
  }
}

/**
 * Steps Apple Health holds for the window, or null if Health can't be read.
 * A statistics query is used because it de-duplicates overlapping sources (a phone and a
 * watch both counting the same walk); adding up raw samples would double count.
 * Steps typed into Health by hand are left out so they can't be used to earn Scores.
 * Apple never tells an app that read access was refused, it just returns nothing, so a
 * refusal looks the same as zero steps. Health is also unreadable while the phone is
 * locked, which is when background runs often happen; the query then fails and returns null.
 */
async function healthKitSteps(start: Date, end: Date, options: ReadOptions): Promise<number | null> {
  const hk = loadHealthKit();
  if (!hk || !(await ensureHealthAccess(hk, options))) return null;
  try {
    const stats = await hk.queryStatisticsForQuantity(STEP_COUNT, ['cumulativeSum'], {
      unit: 'count',
      filter: {
        date: { startDate: start, endDate: end },
        NOT: [
          {
            metadata: {
              withMetadataKey: 'HKWasUserEntered',
              operatorType: hk.ComparisonPredicateOperator.equalTo,
              value: true,
            },
          },
        ],
      },
    });
    return Math.round(stats.sumQuantity?.quantity ?? 0);
  } catch {
    return null;
  }
}

async function sensorSteps(start: Date, end: Date, { interactive }: ReadOptions): Promise<{ access: StepsAccess; steps: number }> {
  if (!(await Pedometer.isAvailableAsync())) return { access: 'unavailable', steps: 0 };
  const permission = interactive ? await Pedometer.requestPermissionsAsync() : await Pedometer.getPermissionsAsync();
  if (!permission.granted) return { access: 'denied', steps: 0 };
  const { steps } = await Pedometer.getStepCountAsync(start, end);
  return { access: 'ready', steps };
}

/**
 * Takes whichever source reports more. Health already includes the phone's own steps, so
 * it normally wins; the sensor wins when Health access was refused or the phone is locked.
 */
async function readIosSteps(start: Date, end: Date, options: ReadOptions): Promise<StepsRead> {
  const fromHealth = await healthKitSteps(start, end, options);
  // The motion sensor only keeps about a week of history, which covers today and yesterday.
  // When Health is available it is the one thing we ask for; the sensor is then read only if
  // the person has already allowed it, so a new user sees one permission sheet, not two.
  const sensorOptions = fromHealth === null ? options : { ...options, interactive: false };
  const sensor = await sensorSteps(start, end, sensorOptions).catch(() => ({ access: 'unavailable' as StepsAccess, steps: 0 }));

  if (fromHealth !== null && fromHealth > 0 && fromHealth >= sensor.steps) {
    return { access: 'ready', steps: fromHealth, source: 'apple_health' };
  }
  if (sensor.access === 'ready') return { access: 'ready', steps: sensor.steps, source: 'expo_sensors' };
  // Health is reachable but empty, and the sensor is blocked: still usable, just nothing yet
  if (fromHealth !== null) return { access: 'ready', steps: 0, source: 'apple_health' };
  return { access: sensor.access, steps: 0, source: 'expo_sensors' };
}

/* ── Android: Health Connect ───────────────────────────────────────────────── */

type HealthConnect = typeof import('react-native-health-connect');

let healthConnect: HealthConnect | null | undefined;

async function loadHealthConnect(): Promise<HealthConnect | null> {
  if (healthConnect !== undefined) return healthConnect;
  try {
    const mod = require('react-native-health-connect') as HealthConnect;
    const available = (await mod.getSdkStatus()) === mod.SdkAvailabilityStatus.SDK_AVAILABLE;
    healthConnect = available && (await mod.initialize()) ? mod : null;
  } catch {
    healthConnect = null;
  }
  return healthConnect;
}

async function canReadSteps(hc: HealthConnect): Promise<boolean> {
  const granted = await hc.getGrantedPermissions();
  return granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps');
}

async function readAndroidSteps(start: Date, end: Date, { interactive }: ReadOptions): Promise<StepsRead> {
  const none = (access: StepsAccess): StepsRead => ({ access, steps: 0, source: 'health_connect' });
  const hc = await loadHealthConnect();
  if (!hc) return none('unavailable');

  try {
    if (!(await canReadSteps(hc))) {
      if (!interactive) return none('denied');
      await hc.requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
      if (!(await canReadSteps(hc))) return none('denied');
      // Asked once, straight after steps are allowed. Without it Health Connect refuses
      // reads while the app is closed. Not offered on every device, so a failure is fine.
      if (!(await hasAsked())) {
        await markAsked();
        await hc.requestPermission([{ accessType: 'read', recordType: 'BackgroundAccessPermission' }]).catch(() => undefined);
      }
    }

    // An aggregate, so steps reported by more than one app for the same walk count once
    const result = await hc.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    });
    return { access: 'ready', steps: Math.round(result.COUNT_TOTAL ?? 0), source: 'health_connect' };
  } catch {
    // In the background this is usually the missing background-read permission
    return none(interactive ? 'unavailable' : 'denied');
  }
}

/* ── Shared ────────────────────────────────────────────────────────────────── */

/** Steps for a window from the best source this phone has. */
export async function readSteps(start: Date, end: Date, options: ReadOptions): Promise<StepsRead> {
  if (Platform.OS === 'ios') return readIosSteps(start, end, options);
  if (Platform.OS === 'android') return readAndroidSteps(start, end, options);
  return { access: 'unavailable', steps: 0, source: 'expo_sensors' };
}

/** Midnight-to-midnight in the phone's own timezone; offsetDays -1 is yesterday. */
export function localDay(offsetDays = 0, now = new Date()): { start: Date; end: Date; date: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays + 1);
  const end = nextMidnight < now ? nextMidnight : now;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start, end, date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` };
}
