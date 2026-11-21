// Pure. The pre-match readiness check-in: four 1 to 5 scales and an optional private note.

export const READINESS_FIELDS = [
  { key: 'sleep', label: 'Sleep', low: 'Poor', high: 'Great' },
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Good' },
  { key: 'soreness', label: 'Soreness', low: 'Very sore', high: 'Fresh' },
  { key: 'stress', label: 'Stress', low: 'Very stressed', high: 'Calm' },
] as const;

export type ReadinessKey = (typeof READINESS_FIELDS)[number]['key'];
export type ReadinessInput = Record<ReadinessKey, number> & { notes?: string | null };

export const MAX_NOTE = 500;

/** For every scale, 5 is the best: great sleep, good mood, fresh legs, calm head. */
export function validateReadiness(input: unknown): { ok: true; value: ReadinessInput } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Please answer all four questions.' };
  const raw = input as Record<string, unknown>;
  const out: Partial<ReadinessInput> = {};
  for (const f of READINESS_FIELDS) {
    const v = raw[f.key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) return { ok: false, error: `Please choose a score from 1 to 5 for ${f.label.toLowerCase()}.` };
    out[f.key] = v;
  }
  const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';
  if (notes.length > MAX_NOTE) return { ok: false, error: `Keep your note under ${MAX_NOTE} characters.` };
  return { ok: true, value: { ...(out as Record<ReadinessKey, number>), notes: notes || null } };
}

/** A plain-English line for the overall picture. General, not medical. */
export function readinessSummary(r: Record<ReadinessKey, number>): string {
  const avg = (r.sleep + r.mood + r.soreness + r.stress) / 4;
  if (avg >= 4) return 'You look ready to play.';
  if (avg >= 3) return 'A fairly normal day. Use the checklist to settle in.';
  return 'Not your best day. Go easy, warm up well, and speak to your captain or coach if something is bothering you.';
}
