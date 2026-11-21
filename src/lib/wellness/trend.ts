// Pure. Readiness trend and recovery-log helpers.

import { READINESS_FIELDS, type ReadinessKey } from './readiness';

export type ReadinessDay = { date: string; sleep: number; mood: number; soreness: number; stress: number };

export const TREND_DAYS = 28;

/** The days from `end` going back `days` days (inclusive), oldest first, as YYYY-MM-DD. */
export function lastDays(end: string, days: number): string[] {
  const base = new Date(`${end}T12:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base); d.setUTCDate(base.getUTCDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** One value per day for a scale, or null where there was no check-in, so gaps stay gaps. */
export function series(rows: ReadinessDay[], key: ReadinessKey, days: string[]): Array<number | null> {
  const by = new Map(rows.map((r) => [r.date, r[key]]));
  return days.map((d) => by.get(d) ?? null);
}

export function average(rows: ReadinessDay[], key: ReadinessKey): number | null {
  if (!rows.length) return null;
  return Math.round((rows.reduce((n, r) => n + r[key], 0) / rows.length) * 10) / 10;
}

/** A short, non-clinical line about the last week against the weeks before. Needs enough days to say anything. */
export function trendLine(rows: ReadinessDay[], today: string): string {
  const recentDays = new Set(lastDays(today, 7));
  const recent = rows.filter((r) => recentDays.has(r.date));
  const earlier = rows.filter((r) => !recentDays.has(r.date));
  if (recent.length < 3 || earlier.length < 3) return 'Check in on a few more days and a pattern will start to show.';
  const score = (set: ReadinessDay[]) => READINESS_FIELDS.reduce((n, f) => n + (average(set, f.key) ?? 0), 0) / READINESS_FIELDS.length;
  const diff = score(recent) - score(earlier);
  if (diff >= 0.4) return 'The last week looks better than the weeks before it.';
  if (diff <= -0.4) return 'The last week looks harder than the weeks before it. Go easy, and talk to someone if it is weighing on you.';
  return 'The last week looks much like the weeks before it.';
}

// ── Recovery log ─────────────────────────────────────────────────────────────────────────────────

export const MAX_ACTIVITY = 200;
export const MAX_RECOVERY_NOTE = 500;

export type RecoveryInput = { soreness: number | null; activity: string | null; notes: string | null };

export function validateRecovery(input: unknown): { ok: true; value: RecoveryInput } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Add a score or a note first.' };
  const raw = input as Record<string, unknown>;
  let soreness: number | null = null;
  if (raw.soreness !== null && raw.soreness !== undefined && raw.soreness !== '') {
    if (typeof raw.soreness !== 'number' || !Number.isInteger(raw.soreness) || raw.soreness < 1 || raw.soreness > 5) return { ok: false, error: 'Soreness is a score from 1 to 5.' };
    soreness = raw.soreness;
  }
  const activity = typeof raw.activity === 'string' ? raw.activity.trim() : '';
  const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';
  if (activity.length > MAX_ACTIVITY) return { ok: false, error: `Keep what you did under ${MAX_ACTIVITY} characters.` };
  if (notes.length > MAX_RECOVERY_NOTE) return { ok: false, error: `Keep your note under ${MAX_RECOVERY_NOTE} characters.` };
  if (soreness === null && !activity && !notes) return { ok: false, error: 'Add a score or a note first.' };
  return { ok: true, value: { soreness, activity: activity || null, notes: notes || null } };
}

const SERIOUS = /\b(sharp|severe|swelling|swollen|numb|numbness|can'?t (put|bear|walk|move)|cannot (put|bear|walk|move)|popped|snapped|locked|chest pain|dizzy|faint|head injury|concuss)/i;

/** Whether the words suggest something a physio or doctor should look at. A nudge, never a diagnosis. */
export function soundsSerious(text: string): boolean {
  return SERIOUS.test(text);
}

export const SERIOUS_NUDGE = 'That sounds like something to get looked at. Please speak to a physio, your GP or a trusted adult. In an emergency call 999; for urgent advice call NHS 111.';

// ── Routine ──────────────────────────────────────────────────────────────────────────────────────

export const MAX_ROUTINE_ITEMS = 30;

/** Keep only known, de-duplicated items, in the order given. */
export function cleanRoutine(ids: unknown, known: ReadonlySet<string>): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) if (typeof id === 'string' && known.has(id) && !out.includes(id)) out.push(id);
  return out.slice(0, MAX_ROUTINE_ITEMS);
}
