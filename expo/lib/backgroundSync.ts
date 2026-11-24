import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { syncSteps } from './stepsSync';

// Syncs steps while the app is closed, so a streak doesn't depend on opening the app.
//
// The operating system decides when this runs. minimumInterval is only a floor: iOS tends to
// run background tasks a few times a day, often overnight or on charge, and skips them in Low
// Power Mode or if the user has force-quit the app. Android (WorkManager) is more regular.
// It is a safety net alongside the sync that runs every time the app is opened.

const STEPS_TASK = 'shiftup-steps-sync';
const MINIMUM_INTERVAL_MINUTES = 60;

// Must be defined at module scope: the OS can start the app headless just to run this task,
// and only code that runs on import exists at that point. Imported from app/_layout.tsx.
TaskManager.defineTask(STEPS_TASK, async () => {
  try {
    // Never show a permission sheet from the background; read only what is already allowed
    await syncSteps({ interactive: false });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Turns background step sync on. Safe to call on every launch. */
export async function registerStepsBackgroundSync(): Promise<void> {
  try {
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(STEPS_TASK)) return;
    await BackgroundTask.registerTaskAsync(STEPS_TASK, { minimumInterval: MINIMUM_INTERVAL_MINUTES });
  } catch {
    // Background sync is a bonus; the foreground sync still works without it
  }
}

/** Turns it off, e.g. on sign-out, so a signed-out phone stops waking up. */
export async function unregisterStepsBackgroundSync(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(STEPS_TASK)) await BackgroundTask.unregisterTaskAsync(STEPS_TASK);
  } catch {
    // Nothing to clean up
  }
}
