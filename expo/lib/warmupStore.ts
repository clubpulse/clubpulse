// What Warm-Up remembers, kept on this phone only: which weeks of Mind Nets are done, and the
// player's own pre-ball routine. Neither says anything about how someone feels, and neither is
// ever sent to ClubPulse.

import AsyncStorage from '@react-native-async-storage/async-storage';

const WEEKS = 'clubpulse.warmup.weeks';
const ROUTINE = 'clubpulse.warmup.routine';

export type Routine = { breath: string; look: string; word: string; trigger: string };
export const EMPTY_ROUTINE: Routine = { breath: '', look: '', word: '', trigger: '' };

export async function getDoneWeeks(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(WEEKS);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

export async function setWeekDone(id: string, done: boolean): Promise<string[]> {
  const now = new Set(await getDoneWeeks());
  if (done) now.add(id); else now.delete(id);
  const list = [...now];
  try { await AsyncStorage.setItem(WEEKS, JSON.stringify(list)); } catch { /* the tick is lost; nothing else depends on it */ }
  return list;
}

export async function getRoutine(): Promise<Routine> {
  try {
    const raw = await AsyncStorage.getItem(ROUTINE);
    const r = raw ? (JSON.parse(raw) as Partial<Routine>) : {};
    return { breath: r.breath ?? '', look: r.look ?? '', word: r.word ?? '', trigger: r.trigger ?? '' };
  } catch { return EMPTY_ROUTINE; }
}

export async function saveRoutine(routine: Routine): Promise<void> {
  try { await AsyncStorage.setItem(ROUTINE, JSON.stringify(routine)); } catch { /* not saved; the screen says so */ throw new Error('Could not save on this phone.'); }
}
