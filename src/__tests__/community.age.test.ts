import { ageOn, ageStatus, isPlausibleDob, HOLD_NEEDS_DOB, HOLD_NEEDS_GUARDIAN, HOLD_PENDING_PARENT } from '@/lib/community/age';

const on = new Date(Date.UTC(2026, 10, 22)); // 22 Nov 2026

describe('ageOn', () => {
  it('counts whole years, and the birthday itself', () => {
    expect(ageOn('2008-11-22', on)).toBe(18);
    expect(ageOn('2008-11-23', on)).toBe(17);
    expect(ageOn('2000-02-29', on)).toBe(26);
  });
  it('is null for anything that is not a real date', () => {
    for (const bad of [null, undefined, '', 'yesterday', '2026-13-01', '2026-02-30', '22/11/2000']) expect(ageOn(bad as never, on)).toBeNull();
  });
});

describe('isPlausibleDob', () => {
  it('rejects the future and the implausibly old', () => {
    expect(isPlausibleDob('2026-11-23', on)).toBe(false);
    expect(isPlausibleDob('1800-01-01', on)).toBe(false);
    expect(isPlausibleDob('1990-05-05', on)).toBe(true);
    expect(isPlausibleDob(19900505, on)).toBe(false);
  });
});

describe('ageStatus', () => {
  it('shuts out anyone whose age is not known', () => {
    expect(ageStatus({ clubJunior: false, dob: null, hasVerifiedParent: false }, on)).toMatchObject({ status: 'needs_dob', cleared: false, hold: HOLD_NEEDS_DOB });
    expect(ageStatus({ clubJunior: false, dob: 'rubbish', hasVerifiedParent: true }, on).cleared).toBe(false);
  });
  it('treats an under-18 by date of birth as a junior even when no admin has marked them', () => {
    const r = ageStatus({ clubJunior: false, dob: '2012-03-01', hasVerifiedParent: false }, on);
    expect(r).toMatchObject({ junior: true, status: 'pending_parent', cleared: false, hold: HOLD_PENDING_PARENT });
  });
  it('opens to a junior only once a verified parent is linked', () => {
    expect(ageStatus({ clubJunior: false, dob: '2012-03-01', hasVerifiedParent: true }, on)).toMatchObject({ junior: true, status: 'junior', cleared: true });
  });
  it('lets a club admin\'s junior mark win over a date that says 18 or over', () => {
    expect(ageStatus({ clubJunior: true, dob: '1990-01-01', hasVerifiedParent: false }, on)).toMatchObject({ junior: true, cleared: false });
    expect(ageStatus({ clubJunior: true, dob: null, hasVerifiedParent: true }, on)).toMatchObject({ junior: true, status: 'junior', cleared: true });
  });
  it('treats a verified parent link as guardian consent, and still holds an under-13 with neither', () => {
    expect(ageStatus({ clubJunior: false, dob: '2015-01-01', hasVerifiedParent: true }, on)).toMatchObject({ status: 'junior', cleared: true, hold: null });
    expect(ageStatus({ clubJunior: false, dob: '2015-01-01', hasVerifiedParent: false }, on)).toMatchObject({ status: 'needs_guardian', cleared: false, hold: HOLD_NEEDS_GUARDIAN });
    expect(ageStatus({ clubJunior: false, dob: '2015-01-01', hasVerifiedParent: false, guardianConsented: true }, on)).toMatchObject({ status: 'pending_parent', cleared: false });
    expect(ageStatus({ clubJunior: false, dob: '2015-01-01', hasVerifiedParent: true, requireDobConfirmation: true }, on)).toMatchObject({ status: 'needs_dob_confirmation', cleared: false });
  });
  it('opens to an adult with a date of birth', () => {
    expect(ageStatus({ clubJunior: false, dob: '1990-01-01', hasVerifiedParent: false }, on)).toMatchObject({ junior: false, status: 'adult', cleared: true, hold: null });
  });
});
