// Shapes returned by the Wellness API (see src/lib/wellness on the server). The check-in, recovery
// log and sharing choices are saved to your ShiftUp account, so they follow you between phone and
// website. They are private to you; a coach sees averages only, and only if you choose to share.

export const READINESS_FIELDS = [
  { key: 'sleep', label: 'Sleep', low: 'Poor', high: 'Great' },
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Good' },
  { key: 'soreness', label: 'Soreness', low: 'Very sore', high: 'Fresh' },
  { key: 'stress', label: 'Stress', low: 'Very stressed', high: 'Calm' },
] as const;
export type ReadinessKey = (typeof READINESS_FIELDS)[number]['key'];

export type ReadinessDay = { date: string; sleep: number; mood: number; soreness: number; stress: number };
export type ReadinessToday = {
  date: string;
  readiness: (Record<ReadinessKey, number> & { notes: string | null }) | null;
  trend: { days: string[]; rows: ReadinessDay[] };
};
export type RecoveryRow = { id: string; date: string; soreness: number | null; activity: string | null; notes: string | null };
export type ShareClub = { clubId: string; name: string; share: boolean; canShare: boolean };
export type Certificate = { name: string; title: string; completedOn: string; graduate: boolean };

/** For every scale 5 is best, so a higher bar is always a better day. */
export function summary(r: Record<ReadinessKey, number>): string {
  const avg = (r.sleep + r.mood + r.soreness + r.stress) / 4;
  if (avg >= 4) return 'You look ready to play.';
  if (avg >= 3) return 'A fairly normal day. Go through your match-day checklist to settle in.';
  return 'Not your best day. Go easy, warm up well, and speak to your captain or coach if something is bothering you.';
}

export const SERIOUS_WORDS = /\b(sharp|severe|swelling|swollen|numb|numbness|can'?t (put|bear|walk|move)|cannot (put|bear|walk|move)|popped|snapped|locked|chest pain|dizzy|faint|head injury|concuss)/i;
export const SERIOUS_NUDGE = 'That sounds like something to get looked at. Please speak to a physio, your GP or a trusted adult. In an emergency call 999; for urgent advice call NHS 111.';

export const prettyDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
