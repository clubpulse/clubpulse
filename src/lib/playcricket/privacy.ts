import { ageOn } from '@/lib/community/age';

/**
 * A Play-Cricket name is not a SHIFTUP account. The link to an account is hidden from other people
 * when that account is a junior, under 18, or has no date of birth. The date of birth itself is never returned.
 */
export function linkedAccountIsPrivate(input: { isJunior: boolean; dateOfBirth: string | null }): boolean {
  if (input.isJunior) return true;
  const age = ageOn(input.dateOfBirth);
  return age === null || age < 18;
}

export type VisibleLink = { playerName: string; teamId: string | null; userId: string | null };

export function visibleLinks(
  rows: Array<{ playerName: string; teamId: string | null; userId: string; isJunior: boolean; dateOfBirth: string | null }>,
  viewerIsClubAdmin: boolean,
): VisibleLink[] {
  return rows.map((row) => {
    const hide = !viewerIsClubAdmin && linkedAccountIsPrivate(row);
    return { playerName: row.playerName, teamId: row.teamId, userId: hide ? null : row.userId };
  });
}
