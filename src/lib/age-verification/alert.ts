export const DEFAULT_SAFEGUARDING_LEAD_EMAIL = 'hello@shiftup.club';

export function safeguardingLeadEmail(env: Record<string, string | undefined> = process.env): string {
  return env.SAFEGUARDING_LEAD_EMAIL?.trim() || DEFAULT_SAFEGUARDING_LEAD_EMAIL;
}

/** The alert names the person and the squad. It never includes a date of birth. */
export function squadAlert(input: { playerName: string; ageGroup: string; reason: 'mismatch' | 'unverified' }) {
  const why = input.reason === 'mismatch'
    ? 'their age band does not match that squad'
    : 'their date of birth has not been confirmed';
  return {
    subject: 'SHIFTUP safeguarding: squad age check',
    text: [
      `${input.playerName} was not added to the ${input.ageGroup} squad because ${why}.`,
      '',
      'This message does not include a date of birth.',
      'Please confirm the date of birth in SHIFTUP before they are added.',
    ].join('\n'),
  };
}

/** Sent to the club after an unconfirmed under-13 account is deleted. No name, no email address, no date of birth. */
export function purgeAlert(input: { recordId: string; purgedAt: string }) {
  return {
    subject: 'SHIFTUP safeguarding: an under-13 account was deleted',
    text: [
      'An under-13 account linked to this club was deleted because no parent or guardian confirmed it within 14 days.',
      `Reference: ${input.recordId}`,
      `Deleted on: ${input.purgedAt.slice(0, 10)}`,
      '',
      'This message does not include a name, an email address or a date of birth.',
      'A permanent record of the deletion is kept in SHIFTUP.',
    ].join('\n'),
  };
}
