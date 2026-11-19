// Pure. The sums behind the phone app's Home screen.

export type LeaguePlace = { rank: number; behind: number; aheadRank: number | null };

/**
 * Where someone stands in their club's weekly Scores table. Ties share the order they arrive in.
 * `behind` is how many Scores to the person above, 0 at the top. Null if there is no table yet.
 */
export function leaguePlace(totals: Array<{ user_id: string; total: number }>, userId: string): LeaguePlace | null {
  const mine = totals.find((t) => t.user_id === userId);
  if (!mine || mine.total <= 0) return null;
  const sorted = [...totals].sort((a, b) => b.total - a.total);
  const index = sorted.findIndex((t) => t.user_id === userId);
  if (index === 0) return { rank: 1, behind: 0, aheadRank: null };
  return { rank: index + 1, behind: Math.max(1, sorted[index - 1].total - mine.total), aheadRank: index };
}

/** The live check-in streak: today's day if checked in, else yesterday's, else none. */
export function streakFrom(rows: Array<{ checkin_date: string; streak_day: number }>, today: string, yesterday: string): { day: number; doneToday: boolean } {
  const t = rows.find((r) => r.checkin_date === today);
  if (t) return { day: t.streak_day, doneToday: true };
  const y = rows.find((r) => r.checkin_date === yesterday);
  return { day: y ? y.streak_day : 0, doneToday: false };
}

export const AVAILABILITY = ['available', 'unavailable', 'unknown'] as const;
export type Availability = (typeof AVAILABILITY)[number];
export const isAvailability = (v: unknown): v is Availability => (AVAILABILITY as readonly unknown[]).includes(v);
