export const DEFAULT_SAFEGUARDING_LEAD_EMAIL = 'hello@shiftup.club';

export function safeguardingLeadEmail(env: Record<string, string | undefined> = process.env): string {
  return env.SAFEGUARDING_LEAD_EMAIL?.trim() || DEFAULT_SAFEGUARDING_LEAD_EMAIL;
}

const reasonText = (reason: 'mismatch' | 'unverified') => (reason === 'mismatch'
  ? 'their age band does not match that squad'
  : 'their date of birth has not been confirmed');

/** Where a lead opens the queue. */
export function leadQueueUrl(base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shiftup.club'): string {
  return `${base.replace(/\/$/, '')}/safeguarding-lead`;
}

/** Sent to the club's welfare officer. It names the club, the person and the squad. It never includes a date of birth. */
export function squadAlert(input: { playerName: string; ageGroup: string; reason: 'mismatch' | 'unverified'; clubName?: string }) {
  const club = input.clubName ?? 'your club';
  return {
    subject: `SHIFTUP safeguarding: squad age check at ${club}`,
    text: [
      `${input.playerName} was not added to the ${input.ageGroup} squad at ${club} because ${reasonText(input.reason)}.`,
      '',
      'This message does not include a date of birth.',
      'Please confirm the date of birth in SHIFTUP before they are added.',
    ].join('\n'),
  };
}

/**
 * Sent to the platform safeguarding leads when the club has no welfare officer, so nobody at the club can close it.
 * It carries what a lead needs to act: the club, the player, the squad, why, when, how long, the reference and where to go.
 */
export function noWelfareOfficerAlert(input: {
  clubName: string;
  playerName: string;
  ageGroup: string;
  reason: 'mismatch' | 'unverified';
  flagId?: string | null;
  raisedAt: string;
  openFlagsAtClub?: number;
  queueUrl?: string;
}) {
  return {
    subject: `SHIFTUP safeguarding: ${input.clubName} has no welfare officer, squad age check for ${input.playerName}`,
    text: [
      `Club: ${input.clubName} (no welfare officer)`,
      `Player: ${input.playerName}`,
      `Squad: ${input.ageGroup}`,
      `Why it was held: ${reasonText(input.reason)}`,
      `Raised: ${input.raisedAt.slice(0, 16).replace('T', ' ')} UTC`,
      ...(input.flagId ? [`Reference: ${input.flagId}`] : []),
      ...(input.openFlagsAtClub ? [`Open flags at this club: ${input.openFlagsAtClub}`] : []),
      '',
      'The player was not added and has been told to ask their club to confirm their date of birth.',
      `What to do: open the safeguarding lead queue (${input.queueUrl ?? leadQueueUrl()}), review the flag, and close it with a note once the club has confirmed the date of birth.`,
      'You cannot decide a flag that involves you or your own club.',
      '',
      'This message does not include a date of birth.',
    ].join('\n'),
  };
}

/**
 * Sent after an unconfirmed under-13 account is deleted. It names each club, and says which have no welfare officer so a
 * lead knows these are theirs. No name, no email address, no date of birth.
 */
export function purgeAlert(input: { recordId: string; purgedAt: string; clubs?: Array<{ name: string; noWelfareOfficer: boolean }>; queueUrl?: string }) {
  const clubs = input.clubs ?? [];
  const without = clubs.filter((c) => c.noWelfareOfficer);
  return {
    subject: clubs.length > 0
      ? `SHIFTUP safeguarding: an under-13 account was deleted (${clubs.map((c) => c.name).join(', ')})`
      : 'SHIFTUP safeguarding: an under-13 account was deleted',
    text: [
      'An under-13 account linked to this club was deleted because no parent or guardian confirmed it within 14 days.',
      ...(clubs.length > 0 ? [`Club${clubs.length > 1 ? 's' : ''}: ${clubs.map((c) => c.name).join(', ')}`] : []),
      ...(without.length > 0 ? [`No welfare officer at: ${without.map((c) => c.name).join(', ')}. A safeguarding lead should follow this up with the club (${input.queueUrl ?? leadQueueUrl()}).`] : []),
      `Reference: ${input.recordId}`,
      `Deleted on: ${input.purgedAt.slice(0, 10)}`,
      '',
      'This message does not include a name, an email address or a date of birth.',
      'A permanent record of the deletion is kept in SHIFTUP.',
    ].join('\n'),
  };
}

/** Sent to a welfare officer when their club names them and flags are already open. */
export function handoverAlert(input: { clubName: string; count: number }) {
  return {
    subject: `SHIFTUP safeguarding: ${input.count} open squad flag${input.count === 1 ? '' : 's'} handed to you at ${input.clubName}`,
    text: [
      `You are now the welfare officer at ${input.clubName}. ${input.count} squad flag${input.count === 1 ? ' was' : 's were'} already open and ${input.count === 1 ? 'is' : 'are'} now yours to review.`,
      'Open Safeguarding in your club admin to see them. Anything a safeguarding lead already did stays on the record.',
      '',
      'This message does not include a date of birth.',
    ].join('\n'),
  };
}
