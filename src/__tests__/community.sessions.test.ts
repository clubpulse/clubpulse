import { checkCapacity, checkPlace, checkWhen, mayHost, maySeeSession, maySignUp, type SessionContext } from '@/lib/community/rules';

const CLUB = 'club-1';
const ctx = (o: Partial<SessionContext>): SessionContext => ({ viewerJunior: false, viewerClubIds: [CLUB], viewerIsClubStaff: false, ...o });

describe('mayHost', () => {
  it('lets an adult club member host an adult session', () => expect(mayHost('adult', ctx({}), CLUB)).toBe(true));
  it('never lets an under-18 host', () => {
    expect(mayHost('adult', ctx({ viewerJunior: true }), CLUB)).toBe(false);
    expect(mayHost('junior', ctx({ viewerJunior: true, viewerIsClubStaff: true }), CLUB)).toBe(false);
  });
  it('only lets club staff host a junior session', () => {
    expect(mayHost('junior', ctx({}), CLUB)).toBe(false);
    expect(mayHost('junior', ctx({ viewerIsClubStaff: true }), CLUB)).toBe(true);
  });
  it('needs membership of the club', () => {
    expect(mayHost('adult', ctx({ viewerClubIds: [] }), CLUB)).toBe(false);
    expect(mayHost('junior', ctx({ viewerClubIds: ['other'], viewerIsClubStaff: true }), CLUB)).toBe(false);
  });
});

describe('maySignUp and maySeeSession', () => {
  it('adult sessions are for adults only', () => {
    expect(maySignUp('adult', ctx({}), CLUB)).toBe(true);
    expect(maySignUp('adult', ctx({ viewerJunior: true }), CLUB)).toBe(false);
    expect(maySeeSession('adult', ctx({ viewerJunior: true }), CLUB)).toBe(false);
  });
  it('junior sessions are for juniors of that club only', () => {
    expect(maySignUp('junior', ctx({ viewerJunior: true }), CLUB)).toBe(true);
    expect(maySignUp('junior', ctx({ viewerJunior: true, viewerClubIds: ['other'] }), CLUB)).toBe(false);
    expect(maySignUp('junior', ctx({}), CLUB)).toBe(false);
  });
  it('junior sessions are hidden from outside adults and other clubs', () => {
    expect(maySeeSession('junior', ctx({}), CLUB)).toBe(false);
    expect(maySeeSession('junior', ctx({ viewerClubIds: ['other'], viewerIsClubStaff: true }), CLUB)).toBe(false);
    expect(maySeeSession('junior', ctx({ viewerIsClubStaff: true }), CLUB)).toBe(true);
    expect(maySeeSession('junior', ctx({ viewerJunior: true }), CLUB)).toBe(true);
  });
});

describe('checkPlace', () => {
  it('accepts a club ground or public venue', () => {
    expect(checkPlace('Slough CC main ground').ok).toBe(true);
    expect(checkPlace('Upton Court Park nets').ok).toBe(true);
  });
  it('refuses homes, contact details and nothing', () => {
    for (const bad of ['my house', 'come to mine', 'at my place', '07700 900123', 'me@example.com', 'ab', 'a'.repeat(121)]) expect(checkPlace(bad).ok).toBe(false);
  });
});

describe('checkWhen and checkCapacity', () => {
  const now = new Date('2026-11-21T12:00:00Z');
  it('needs a future time within 60 days', () => {
    expect(checkWhen(new Date('2026-11-21T11:00:00Z'), now).ok).toBe(false);
    expect(checkWhen(new Date('2026-11-22T11:00:00Z'), now).ok).toBe(true);
    expect(checkWhen(new Date('2027-03-01T11:00:00Z'), now).ok).toBe(false);
  });
  it('capacity is a whole number from 2 to 30', () => {
    expect([1, 2, 30, 31, 2.5, '5'].map(checkCapacity)).toEqual([false, true, true, false, false, false]);
  });
});
