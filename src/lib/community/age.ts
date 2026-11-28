// Who counts as a junior, and who may use the Community at all. Pure functions with no database.
//
// Until now someone was a junior only once a club admin had marked them. That left a gap: a child who signs up and
// is not marked looks like an adult. Now the date of birth decides, and the Community stays closed to anyone whose
// age is not known, or who is under 18 and has no verified parent linked to their account.
//
// The date of birth is typed in by the person signing up, so it is a declaration and not proof. It stops honest
// mistakes and makes lying a deliberate act; it cannot stop a child who gives a false date. A club admin marking
// someone as a junior still counts, and always wins over a date that says 18 or over.

export type AgeStatus = 'needs_dob' | 'unverified' | 'pending_parent' | 'needs_guardian' | 'needs_dob_confirmation' | 'junior' | 'adult';

export type AgeInfo = {
  status: AgeStatus;
  /** Under 18, by a club admin's mark or by date of birth */
  junior: boolean;
  /** Whether the Community is open to this person at all */
  cleared: boolean;
  /** What to tell them when it is not */
  hold: string | null;
};

export const HOLD_NEEDS_DOB = 'Add your date of birth to your profile to use the Community.';
export const HOLD_NEEDS_DOB_CONFIRMATION = 'A club admin needs to confirm your date of birth before you can use the Community. Ask your club to confirm it.';
export const HOLD_PENDING_PARENT = 'A parent or guardian needs to be linked to your account before you can use the Community. Ask your club to link you.';
export const HOLD_NEEDS_GUARDIAN = 'Under 13s need a parent or guardian to confirm by email before this account can be used.';

const DOB = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whole years old on a day, or null when the date is missing or not a real date. */
export function ageOn(dob: string | null | undefined, today: Date = new Date()): number | null {
  if (typeof dob !== 'string') return null;
  const m = DOB.exec(dob.trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() < mo - 1 || (today.getUTCMonth() === mo - 1 && today.getUTCDate() < d)) age--;
  return age;
}

/** A date of birth that can be believed: a real date, not in the future, and not over 110 years ago. */
export function isPlausibleDob(dob: unknown, today: Date = new Date()): dob is string {
  if (typeof dob !== 'string') return false;
  const age = ageOn(dob, today);
  return age !== null && age >= 0 && age <= 110;
}

/**
 * `requireDobConfirmation` is the DOB_CONFIRMATION_REQUIRED switch. When it is on, a junior also needs a date of birth
 * that a club admin has confirmed (`dobConfirmed`) before the Community opens to them. It applies to juniors only.
 */
export function ageStatus(i: { clubJunior: boolean; dob: string | null | undefined; hasVerifiedParent: boolean; dobConfirmed?: boolean; requireDobConfirmation?: boolean; guardianConsented?: boolean }, today: Date = new Date()): AgeInfo {
  const age = i.dob ? ageOn(i.dob, today) : null;
  const junior = i.clubJunior || (age !== null && age < 18);
  if (!junior && age === null) return { status: 'needs_dob', junior: false, cleared: false, hold: HOLD_NEEDS_DOB };
  // A verified parent link is the guardian's consent, so an under-13 who already has one is not held here.
  // Without that link, and without an emailed confirmation, the account stays closed. Everyone 13 or over
  // skips this and keeps the parent and date-of-birth rules below.
  if (age !== null && age < 13 && !i.guardianConsented && !i.hasVerifiedParent) return { status: 'needs_guardian', junior: true, cleared: false, hold: HOLD_NEEDS_GUARDIAN };
  if (junior && !i.hasVerifiedParent) return { status: 'pending_parent', junior: true, cleared: false, hold: HOLD_PENDING_PARENT };
  if (junior && i.requireDobConfirmation && !(i.dobConfirmed && age !== null)) return { status: 'needs_dob_confirmation', junior: true, cleared: false, hold: HOLD_NEEDS_DOB_CONFIRMATION };
  return { status: junior ? 'junior' : 'adult', junior, cleared: true, hold: null };
}
