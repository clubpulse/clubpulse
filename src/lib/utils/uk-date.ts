/** Today in UK time as YYYY-MM-DD: the day boundary for check-ins, games and match dates. Safe on client and server. */
export function ukToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);
}
