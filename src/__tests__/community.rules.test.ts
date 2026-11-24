import { hasPersonalDetails, mayMessage, milesBetween, normalise, roughDistance, screenText, shownName, type CheckContext } from '@/lib/community/rules';

const pub: CheckContext = { place: 'public', authorJunior: false, readerJunior: true };
const adults: CheckContext = { place: 'private', authorJunior: false, readerJunior: false };
const juniors: CheckContext = { place: 'private', authorJunior: true, readerJunior: true };

describe('screenText', () => {
  it('lets ordinary cricket talk through', () => {
    expect(screenText('Anyone up for nets on Thursday at 6pm? We were poor in the field on Saturday.', pub)).toEqual({ ok: true });
    expect(screenText('Scored 62 not out, first fifty of the season', pub).ok).toBe(true);
  });
  it('stops swearing, however it is spelled', () => {
    for (const t of ['that was shit', 'F.U.C.K off', 'sh1t umpiring', 'fuuuuck', 'what a W4NKER']) expect(screenText(t, adults).ok).toBe(false);
  });
  it('does not trip on innocent words that contain a banned one', () => {
    for (const t of ['Scunthorpe CC away on Sunday', 'Essex and Sussex both won', 'a classic cover drive', 'assessment day for the under 15s']) expect(screenText(t, pub).ok).toBe(true);
  });
  it('stops sexual content and threats', () => {
    expect(screenText('send nudes', adults).ok).toBe(false);
    expect(screenText("I'll kill you after the game", adults).ok).toBe(false);
    expect(screenText('i know where you live', adults).ok).toBe(false);
  });
  it('rejects empty and over-long text', () => {
    expect(screenText('   ', pub).ok).toBe(false);
    expect(screenText('a'.repeat(1001), pub).ok).toBe(false);
  });
});

describe('personal details', () => {
  it('spots phone numbers, emails, postcodes and other apps', () => {
    for (const t of ['call me on 07700 900123', '+44 7700 900123', 'sam@example.com', 'sam at example dot com', 'we are at SL1 3GY', 'add me on snapchat', 'my number is on my profile']) expect(hasPersonalDetails(t)).toBe(true);
  });
  it('leaves scores and dates alone', () => {
    for (const t of ['won by 4 wickets, 212 for 6', 'Saturday 21 November at 13:00', 'he made 105 off 98 balls']) expect(hasPersonalDetails(t)).toBe(false);
  });
  it('lets two adults share details in private', () => {
    expect(screenText('call me on 07700 900123', adults).ok).toBe(true);
  });
  it('keeps them off the public feed, away from juniors, and out of a junior\'s messages', () => {
    expect(screenText('call me on 07700 900123', pub).ok).toBe(false);
    expect(screenText('call me on 07700 900123', { place: 'private', authorJunior: false, readerJunior: true }).ok).toBe(false);
    expect(screenText('add me on snapchat', juniors).ok).toBe(false);
  });
});

describe('who may message whom', () => {
  it('never pairs an adult with a junior', () => {
    expect(mayMessage(false, false)).toBe(true);
    expect(mayMessage(true, true)).toBe(true);
    expect(mayMessage(false, true)).toBe(false);
    expect(mayMessage(true, false)).toBe(false);
  });
});

describe('distance and names', () => {
  it('measures miles between two grounds', () => {
    // The two grounds are roughly 17 miles apart
    expect(Math.round(milesBetween({ lat: 51.5105, lng: -0.595 }, { lat: 51.4543, lng: -0.9781 }))).toBeGreaterThan(15);
    expect(Math.round(milesBetween({ lat: 51.5105, lng: -0.595 }, { lat: 51.4543, lng: -0.9781 }))).toBeLessThan(19);
  });
  it('never gives a distance finer than a mile', () => {
    expect(roughDistance(0.2)).toBe('about a mile away');
    expect(roughDistance(3.4)).toBe('about 3 miles away');
  });
  it('shows a junior by first name only', () => {
    expect(shownName('Alex Reid', true)).toBe('Alex');
    expect(shownName('Dev Reid', false)).toBe('Dev Reid');
    expect(shownName(null, false)).toBe('Member');
  });
  it('undoes letter swaps', () => { expect(normalise('SH1T')).toBe('shit'); });
});
