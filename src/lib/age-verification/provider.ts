import { ageProviderEnabled } from './flag';

export type AgeCheckResult = 'passed' | 'failed' | 'unavailable';

export type AgeCheckProvider = {
  name: string;
  /** Confirms an adult. Must not accept or store a document, a document number, or a date of birth. */
  checkAdult: () => Promise<AgeCheckResult>;
};

/** The only built-in provider. It does not call a company and it does not see a document. */
export const mockAgeProvider: AgeCheckProvider = {
  name: 'mock',
  checkAdult: async () => 'passed',
};

export function resolveAgeProvider(env: Record<string, string | undefined> = process.env): AgeCheckProvider | null {
  if (!ageProviderEnabled(env)) return null;
  if (env.AGE_VERIFICATION_PROVIDER === 'mock') return mockAgeProvider;
  return null;
}

/**
 * Solo adults only. A club member is confirmed by the club. Someone under 18 is not sent to this check.
 * With the provider flag off, or with no named stub, the result is unavailable and the account stays unverified.
 */
export async function runAdultAgeCheck(input: { age: number | null; hasClub: boolean }, env: Record<string, string | undefined> = process.env, provider: AgeCheckProvider | null = resolveAgeProvider(env)): Promise<AgeCheckResult> {
  if (!provider) return 'unavailable';
  if (input.hasClub || input.age === null || input.age < 18) return 'unavailable';
  return provider.checkAdult();
}
