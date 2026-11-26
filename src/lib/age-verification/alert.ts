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
