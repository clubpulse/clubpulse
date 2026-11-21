import { BADGE_DEFS, GROUPS, SHARE_BASE, buildBadges, shareMessage, type Stats } from '@/lib/mobile/badges-logic';

const none: Stats = {
  analyses: 0, coachAiDays: 0, warmupDays: 0, mindWeeks: 0, lessonsPassed: 0, questionsRight: 0, auctionWins: 0,
  trainings: 0, checkins: 0, activeDays: 0, bestStepStreak: 0, scoresEarned: 0, tasksClaimed: 0,
};
const on = { warmupOn: true };
const find = (stats: Partial<Stats>, key: string, opts = on) => buildBadges({ ...none, ...stats }, opts).find((b) => b.key === key)!;

describe('badges', () => {
  it('has a unique, link-safe key for every badge and a known group', () => {
    const keys = BADGE_DEFS.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((k) => expect(k).toMatch(/^[a-z0-9-]+$/));
    BADGE_DEFS.forEach((b) => expect(GROUPS.map((g) => g.key)).toContain(b.group));
  });
  it('starts with nothing earned and nothing to share', () => {
    const all = buildBadges(none, on);
    expect(all).toHaveLength(BADGE_DEFS.length);
    all.forEach((b) => expect(b).toMatchObject({ earned: false, progress: 0, share: null }));
  });
  it('earns a badge at its target and not before', () => {
    expect(find({ analyses: 9 }, 'net-regular')).toMatchObject({ earned: false, progress: 9, target: 10 });
    expect(find({ analyses: 10 }, 'net-regular').earned).toBe(true);
    expect(find({ analyses: 10 }, 'first-ball').earned).toBe(true);
    expect(find({ analyses: 10 }, 'technician').earned).toBe(false);
  });
  it('never shows more progress than the target', () => {
    expect(find({ checkins: 400 }, 'maiden-over')).toMatchObject({ progress: 6, target: 6, earned: true });
  });
  it('gives an earned badge a message and a link that say nothing about the member', () => {
    const b = find({ checkins: 6 }, 'maiden-over');
    expect(b.share).toEqual({ message: 'I checked in on 6 days and earned the Maiden Over badge on ClubPulse 🏏', url: `${SHARE_BASE}/maiden-over` });
    BADGE_DEFS.forEach((d) => expect(shareMessage(d)).toMatch(/^I [a-z]/));
  });
  it('leaves Warm-Up badges out until Warm-Up rewards are on', () => {
    const off = buildBadges({ ...none, warmupDays: 40 }, { warmupOn: false });
    expect(off.some((b) => b.group === 'wellness')).toBe(false);
    expect(find({ mindWeeks: 6 }, 'full-course').earned).toBe(true);
  });
});
