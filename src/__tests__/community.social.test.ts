import { mayFollow, mayViewProfile, type CrossBandContext } from '@/lib/community/rules';

const base: CrossBandContext = { viewerJunior: false, subjectJunior: false, sharesClub: false, adultIsStaffOfSharedClub: false, isLinkedParent: false };
const ctx = (o: Partial<CrossBandContext>): CrossBandContext => ({ ...base, ...o });

describe('mayViewProfile', () => {
  it('lets people in the same age band see each other', () => {
    expect(mayViewProfile(ctx({}))).toBe(true);
    expect(mayViewProfile(ctx({ viewerJunior: true, subjectJunior: true }))).toBe(true);
  });
  it('hides a junior from an unrelated adult', () => {
    expect(mayViewProfile(ctx({ subjectJunior: true }))).toBe(false);
    expect(mayViewProfile(ctx({ subjectJunior: true, sharesClub: true }))).toBe(false);
  });
  it('hides an adult from an unrelated junior', () => {
    expect(mayViewProfile(ctx({ viewerJunior: true }))).toBe(false);
  });
  it('lets a coach or admin of a shared club see a junior, and the junior see them', () => {
    expect(mayViewProfile(ctx({ subjectJunior: true, sharesClub: true, adultIsStaffOfSharedClub: true }))).toBe(true);
    expect(mayViewProfile(ctx({ viewerJunior: true, sharesClub: true, adultIsStaffOfSharedClub: true }))).toBe(true);
  });
  it('lets the linked parent see their child', () => {
    expect(mayViewProfile(ctx({ subjectJunior: true, isLinkedParent: true }))).toBe(true);
  });
  it('does not treat staff of a different club as enough', () => {
    expect(mayViewProfile(ctx({ subjectJunior: true, sharesClub: false, adultIsStaffOfSharedClub: true }))).toBe(false);
  });
});

describe('mayFollow', () => {
  it('lets anyone follow a club', () => {
    expect(mayFollow('club', ctx({ viewerJunior: true }))).toBe(true);
    expect(mayFollow('club', ctx({}))).toBe(true);
  });
  it('lets a junior follow another junior but not an adult', () => {
    expect(mayFollow('player', ctx({ viewerJunior: true, subjectJunior: true }))).toBe(true);
    expect(mayFollow('player', ctx({ viewerJunior: true }))).toBe(false);
    expect(mayFollow('player', ctx({ viewerJunior: true, sharesClub: true, adultIsStaffOfSharedClub: true }))).toBe(false);
  });
  it('lets adults follow adults', () => {
    expect(mayFollow('player', ctx({}))).toBe(true);
  });
  it('stops an unrelated adult following a junior', () => {
    expect(mayFollow('player', ctx({ subjectJunior: true }))).toBe(false);
    expect(mayFollow('player', ctx({ subjectJunior: true, sharesClub: true }))).toBe(false);
  });
  it('lets a coach or the linked parent follow a junior', () => {
    expect(mayFollow('player', ctx({ subjectJunior: true, sharesClub: true, adultIsStaffOfSharedClub: true }))).toBe(true);
    expect(mayFollow('player', ctx({ subjectJunior: true, isLinkedParent: true }))).toBe(true);
  });
});
