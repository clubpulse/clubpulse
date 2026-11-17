import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

// Step sources, best first:
//  1. Apple Health (HealthKit): the user's combined step total from every source they share
//     with Health, e.g. iPhone, Apple Watch, WHOOP, Garmin, Oura, Fitbit. Needs a development
//     or production build; the native module is not in Expo Go.
//  2. The iPhone's own motion sensor (expo-sensors), used when Health is unavailable or the
//     user has not allowed it.
// Android needs Health Connect and is not supported yet.

export type StepSource = 'apple_health' | 'expo_sensors';
export type StepsAccess = 'ready' | 'unavailable' | 'denied';

export type DaySteps = { steps: number; source: StepSource };

type HealthKit = typeof import('@kingstinct/react-native-healthkit');

const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount' as const;

let healthKit: HealthKit | null | undefined;
let healthAuthorised = false;

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

/** Shows the Apple Health permission sheet the first time; a no-op after that. */
async function ensureHealthAccess(hk: HealthKit): Promise<boolean> {
  if (healthAuthorised) return true;
  try {
    await hk.requestAuthorization({ toRead: [STEP_COUNT] });
    healthAuthorised = true;
  } catch {
    healthAuthorised = false;
  }
  return healthAuthorised;
}

/**
 * Steps Apple Health holds for the window, or null if Health can't be read.
 * A statistics query is used because it de-duplicates overlapping sources (a phone and a
 * watch both counting the same walk); adding up raw samples would double count.
 * Steps typed into Health by hand are left out so they can't be used to earn Scores.
 * Apple never tells an app that read access was refused, it just returns nothing, so a
 * refusal looks the same as zero steps.
 */
async function healthSteps(start: Date, end: Date): Promise<number | null> {
  const hk = loadHealthKit();
  if (!hk || !(await ensureHealthAccess(hk))) return null;
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

async function sensorSteps(start: Date, end: Date): Promise<{ access: StepsAccess; steps: number }> {
  if (!(await Pedometer.isAvailableAsync())) return { access: 'unavailable', steps: 0 };
  const permission = await Pedometer.requestPermissionsAsync();
  if (!permission.granted) return { access: 'denied', steps: 0 };
  const { steps } = await Pedometer.getStepCountAsync(start, end);
  return { access: 'ready', steps };
}

/**
 * Steps for a window, taking whichever source reports more. Health already includes the
 * phone's own steps, so it normally wins; the sensor wins when Health access was refused.
 */
export async function readSteps(start: Date, end: Date): Promise<{ access: StepsAccess } & DaySteps> {
  if (Platform.OS !== 'ios') return { access: 'unavailable', steps: 0, source: 'expo_sensors' };

  const fromHealth = await healthSteps(start, end);
  // The motion sensor only keeps about a week of history, which covers today and yesterday
  const sensor = await sensorSteps(start, end).catch(() => ({ access: 'unavailable' as StepsAccess, steps: 0 }));

  if (fromHealth !== null && fromHealth > 0 && fromHealth >= sensor.steps) {
    return { access: 'ready', steps: fromHealth, source: 'apple_health' };
  }
  if (sensor.access === 'ready') return { access: 'ready', steps: sensor.steps, source: 'expo_sensors' };
  // Health is reachable but empty, and the sensor is blocked: still usable, just nothing yet
  if (fromHealth !== null) return { access: 'ready', steps: 0, source: 'apple_health' };
  return { access: sensor.access, steps: 0, source: 'expo_sensors' };
}

/** Midnight-to-midnight in the phone's own timezone; offsetDays -1 is yesterday. */
export function localDay(offsetDays = 0, now = new Date()): { start: Date; end: Date; date: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays + 1);
  const end = nextMidnight < now ? nextMidnight : now;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start, end, date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` };
}
