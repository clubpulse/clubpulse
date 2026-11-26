import {
  HOLD_NEEDS_DOB, HOLD_NEEDS_GUARDIAN, HOLD_PENDING_PARENT, ageOn, isPlausibleDob, type AgeInfo,
} from '@/lib/community/age';

/** Shown to the player. It does not say why, and it never includes a date of birth. */
export const PLAYER_DOB_HOLD = 'Your club needs to confirm your date of birth';

export const DOB_METHODS = [
  'passport_in_person',
  'birth_certificate',
  'driving_licence',
  'existing_registration',
  'video_call',
  'verified_parent_vouch',
  'third_party_check',
] as const;
export type DobMethod = (typeof DOB_METHODS)[number];
export const isDobMethod = (value: unknown): value is DobMethod => typeof value === 'string' && (DOB_METHODS as readonly string[]).includes(value);

export const DOB_METHOD_LABELS: Record<DobMethod, string> = {
  passport_in_person: 'Passport, seen in person',
  birth_certificate: 'Birth certificate, seen in person',
  driving_licence: 'Driving licence, seen in person',
  existing_registration: 'Club registration the club already holds',
  video_call: 'Seen on a video call',
  verified_parent_vouch: 'A verified parent or guardian vouched',
  third_party_check: 'Third-party age check',
};

export type VerificationInput = {
  clubJunior: boolean;
  dob: string | null | undefined;
  hasVerifiedParent: boolean;
  dobConfirmed?: boolean;
  guardianConsented?: boolean;
  /** An adult with no club passed the provider check. Never a document, and never a minor. */
  thirdPartyPassed?: boolean;
  /** A linked parent or guardian is themselves age-verified. */
  guardianVerified?: boolean;
};

/**
 * A typed age is not proof. Nobody becomes an adult, and the Community stays closed, until a club
 * confirmation, a third-party pass for a solo adult, or a verified guardian for someone under 18.
 * Under-13s also need the guardian email confirmation. Solo features are a separate question: this
 * only decides Community and adult treatment.
 */
export function verifiedAge(input: VerificationInput, today: Date = new Date()): AgeInfo {
  const age = input.dob ? ageOn(input.dob, today) : null;
  const junior = input.clubJunior || (age !== null && age < 18);
  if (age === null) return { status: 'needs_dob', junior: input.clubJunior, cleared: false, hold: HOLD_NEEDS_DOB };
  const clubOk = input.dobConfirmed === true;
  const providerOk = input.thirdPartyPassed === true && age >= 18 && !input.clubJunior;
  const guardianOk = age < 18 && input.guardianVerified === true && (input.hasVerifiedParent || input.guardianConsented === true);
  const under13Ok = age >= 13 || input.guardianConsented === true;
  if (!(under13Ok && (clubOk || providerOk || guardianOk))) {
    if (age < 13 && !input.guardianConsented) return { status: 'needs_guardian', junior: true, cleared: false, hold: HOLD_NEEDS_GUARDIAN };
    return { status: 'unverified', junior, cleared: false, hold: PLAYER_DOB_HOLD };
  }
  if (junior && !input.hasVerifiedParent && !guardianOk) return { status: 'pending_parent', junior: true, cleared: false, hold: HOLD_PENDING_PARENT };
  return { status: junior ? 'junior' : 'adult', junior, cleared: true, hold: null };
}

/** Missing a date of birth blocks the app. Unverified people, who have a date, are not blocked here. */
export function dobBlockPath(pathname: string, needsDob: boolean, enabled: boolean): '/auth/date-of-birth' | null {
  if (!enabled || !needsDob) return null;
  const path = pathname.split('?')[0] || '/';
  if (path.startsWith('/api')) return null;
  if (path === '/auth/date-of-birth' || path.startsWith('/auth/signout') || path.startsWith('/auth/callback') || path.startsWith('/auth/confirm')) return null;
  return '/auth/date-of-birth';
}

export function signupDobError(dob: unknown, enabled: boolean): string | null {
  if (!enabled) return null;
  return isPlausibleDob(dob) ? null : 'Enter your date of birth as a real date.';
}

const SQUAD_JUNIOR = new Set(['U11', 'U13', 'U15', 'U18']);

export function squadIsJunior(ageGroup: string): boolean {
  return SQUAD_JUNIOR.has(ageGroup);
}

/** True when a declared age band does not belong on that squad. An unknown age is not a mismatch. */
export function ageSquadMismatch(input: { age: number | null; clubJunior: boolean; ageGroup: string }): boolean {
  const juniorSquad = squadIsJunior(input.ageGroup);
  const personJunior = input.clubJunior || (input.age !== null && input.age < 18);
  const personAdult = !input.clubJunior && input.age !== null && input.age >= 18;
  if (personJunior && !juniorSquad) return true;
  if (personAdult && juniorSquad) return true;
  return false;
}

export const PURGE_AFTER_DAYS = 14;

/** An under-13 whose guardian has not confirmed by email, once 14 days have passed. */
export function under13PurgeDue(input: { createdAt: string; confirmedAt: string | null; age: number | null }, now: Date): boolean {
  if (input.confirmedAt) return false;
  if (input.age === null || input.age >= 13) return false;
  const created = new Date(input.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return created <= now.getTime() - PURGE_AFTER_DAYS * 86_400_000;
}
