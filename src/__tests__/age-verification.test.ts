import { ageStatus } from '@/lib/community/age';
import { squadAlert } from '@/lib/age-verification/alert';
import { ageProviderEnabled, ageVerificationEnabled } from '@/lib/age-verification/flag';
import { mockAgeProvider, runAdultAgeCheck } from '@/lib/age-verification/provider';
import {
  PLAYER_DOB_HOLD, ageSquadMismatch, dobBlockPath, signupDobError, under13PurgeDue, verifiedAge,
} from '@/lib/age-verification/rules';

const day = new Date('2026-11-26T12:00:00Z');

describe('age verification flag', () => {
  it('stays off unless it is exactly true, and the provider stays off with it', () => {
    expect(ageVerificationEnabled({})).toBe(false);
    expect(ageProviderEnabled({ AGE_VERIFICATION_ENABLED: 'true' })).toBe(false);
    expect(ageProviderEnabled({ AGE_VERIFICATION_ENABLED: 'true', AGE_VERIFICATION_PROVIDER_ENABLED: 'true' })).toBe(true);
    expect(ageStatus({ clubJunior: false, dob: '1990-01-01', hasVerifiedParent: false }).status).toBe('adult');
  });
});

describe('verified age', () => {
  it('does not treat a missing or unchecked date as an adult', () => {
    expect(verifiedAge({ clubJunior: false, dob: null, hasVerifiedParent: false }, day)).toMatchObject({ status: 'needs_dob', junior: false, cleared: false });
    expect(verifiedAge({ clubJunior: false, dob: '1990-01-01', hasVerifiedParent: false }, day)).toMatchObject({ status: 'unverified', junior: false, cleared: false, hold: PLAYER_DOB_HOLD });
    expect(verifiedAge({ clubJunior: false, dob: '1990-01-01', hasVerifiedParent: false, thirdPartyPassed: true }, day).status).toBe('adult');
    expect(verifiedAge({ clubJunior: true, dob: '2012-01-01', hasVerifiedParent: true, dobConfirmed: true, guardianConsented: true }, day)).toMatchObject({ status: 'junior', cleared: true });
    expect(verifiedAge({ clubJunior: false, dob: '2014-01-01', hasVerifiedParent: false, guardianConsented: false }, day).status).toBe('needs_guardian');
    expect(verifiedAge({ clubJunior: false, dob: '2014-01-01', hasVerifiedParent: true, guardianConsented: true, guardianVerified: true }, day)).toMatchObject({ status: 'junior', cleared: true });
  });

  it('blocks sign-in until a date is entered and still allows solo use once it is unverified', () => {
    expect(dobBlockPath('/dashboard', true, true)).toBe('/auth/date-of-birth');
    expect(dobBlockPath('/auth/date-of-birth', true, true)).toBeNull();
    expect(dobBlockPath('/api/analysis/save-result', true, true)).toBeNull();
    expect(dobBlockPath('/dashboard', false, true)).toBeNull();
    expect(dobBlockPath('/dashboard', true, false)).toBeNull();
    expect(signupDobError(undefined, false)).toBeNull();
    expect(signupDobError('not-a-date', true)).toMatch(/date of birth/);
  });

  it('flags a junior on an open squad and an adult on a junior squad, without storing a date', () => {
    expect(ageSquadMismatch({ age: 15, clubJunior: false, ageGroup: 'Open' })).toBe(true);
    expect(ageSquadMismatch({ age: 30, clubJunior: false, ageGroup: 'U15' })).toBe(true);
    expect(ageSquadMismatch({ age: 15, clubJunior: false, ageGroup: 'U18' })).toBe(false);
    const alert = squadAlert({ playerName: 'Alex Player', ageGroup: 'Open', reason: 'mismatch' });
    expect(alert.text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(alert.text).not.toContain('injury');
    expect(PLAYER_DOB_HOLD).toBe('Your club needs to confirm your date of birth');
  });

  it('deletes an unconfirmed under-13 only after 14 days', () => {
    const created = '2026-11-01T00:00:00Z';
    expect(under13PurgeDue({ createdAt: created, confirmedAt: null, age: 10 }, day)).toBe(true);
    expect(under13PurgeDue({ createdAt: '2026-11-20T00:00:00Z', confirmedAt: null, age: 10 }, day)).toBe(false);
    expect(under13PurgeDue({ createdAt: created, confirmedAt: '2026-11-02T00:00:00Z', age: 10 }, day)).toBe(false);
    expect(under13PurgeDue({ createdAt: created, confirmedAt: null, age: 16 }, day)).toBe(false);
  });

  it('keeps the third-party stub unavailable until its flag and the mock are both on', async () => {
    expect(await runAdultAgeCheck({ age: 30, hasClub: false }, {})).toBe('unavailable');
    expect(await runAdultAgeCheck({ age: 30, hasClub: false }, { AGE_VERIFICATION_ENABLED: 'true', AGE_VERIFICATION_PROVIDER_ENABLED: 'true' })).toBe('unavailable');
    expect(await runAdultAgeCheck({ age: 16, hasClub: false }, { AGE_VERIFICATION_ENABLED: 'true', AGE_VERIFICATION_PROVIDER_ENABLED: 'true', AGE_VERIFICATION_PROVIDER: 'mock' })).toBe('unavailable');
    expect(await runAdultAgeCheck({ age: 30, hasClub: true }, { AGE_VERIFICATION_ENABLED: 'true', AGE_VERIFICATION_PROVIDER_ENABLED: 'true', AGE_VERIFICATION_PROVIDER: 'mock' })).toBe('unavailable');
    expect(await runAdultAgeCheck({ age: 30, hasClub: false }, { AGE_VERIFICATION_ENABLED: 'true', AGE_VERIFICATION_PROVIDER_ENABLED: 'true', AGE_VERIFICATION_PROVIDER: 'mock' }, mockAgeProvider)).toBe('passed');
  });
});
