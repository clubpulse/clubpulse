// Pure. The safety checks for scripts/seed-demo-club.ts, kept here so they are tested.

export const DEMO_EMAIL_DOMAIN = '@example.com';
export const DEMO_CLUB_NAMES = ['ClubPulse Demo CC', 'ClubPulse Demo Rovers CC'] as const;

export type GuardInput = {
  env: Record<string, string | undefined>;
  argv: string[];
  /** Profiles whose email is not a fictional @example.com address */
  realLookingProfiles: number;
};

export type GuardResult = { ok: true } | { ok: false; reason: string };

/**
 * The seed runs only when DEMO_SEED=yes and --confirm are both given. If the database already holds
 * profiles that look real, it refuses unless --this-is-a-demo-project is also given, because it must
 * never be pointed at a database of real members.
 */
export function guardSeed({ env, argv, realLookingProfiles }: GuardInput): GuardResult {
  if (env.DEMO_SEED !== 'yes') return { ok: false, reason: 'Refusing to run: set DEMO_SEED=yes.' };
  if (!argv.includes('--confirm')) return { ok: false, reason: 'Refusing to run: pass --confirm.' };
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, reason: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.' };
  if (realLookingProfiles > 0 && !argv.includes('--this-is-a-demo-project')) {
    return { ok: false, reason: `Refusing to run: this database has ${realLookingProfiles} profile(s) that are not @example.com. Use a dedicated demo Supabase project, then add --this-is-a-demo-project.` };
  }
  return { ok: true };
}

export const isDemoEmail = (email: string | null | undefined): boolean => !!email && email.toLowerCase().endsWith(DEMO_EMAIL_DOMAIN);

/** The next given weekday (0 = Sunday … 6 = Saturday) strictly after `from`, as YYYY-MM-DD. */
export function nextWeekday(from: Date, weekday: number): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() + 1); while (d.getUTCDay() !== weekday);
  return d.toISOString().slice(0, 10);
}

/** A repeatable 1 to 5 score for a person and day, so the demo trend is the same every run. */
export function demoScore(seed: number, day: number, base: number): number {
  const wobble = ((seed * 7 + day * 13) % 3) - 1;
  return Math.min(5, Math.max(1, base + wobble));
}
