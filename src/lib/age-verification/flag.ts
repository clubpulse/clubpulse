/** Off unless AGE_VERIFICATION_ENABLED is exactly "true". */
export const AGE_VERIFICATION_FLAG = 'AGE_VERIFICATION_ENABLED';
/** Off unless this is exactly "true" as well. The third-party check never runs without it. */
export const AGE_PROVIDER_FLAG = 'AGE_VERIFICATION_PROVIDER_ENABLED';

export function ageVerificationEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[AGE_VERIFICATION_FLAG] === 'true';
}

export function ageProviderEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return ageVerificationEnabled(env) && env[AGE_PROVIDER_FLAG] === 'true';
}
