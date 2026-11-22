import { BADGE_DEFS, GROUPS, SHARE_BASE, buildBadges, shareMessage, type Stats } from '@/lib/mobile/badges-logic';

const none: Stats = {
  analyses: 0, ballSessions: 0, auctionsPlayed: 0, plansMade: 0, totalSteps: 0, coachAiDays: 0, warmupDays: 0, mindWeeks: 0, lessonsPassed: 0, questionsRight: 0, auctionWins: 0,
  trainings: 0, checkins: 0, activeDays: 0, bestStepStreak: 0, scoresEarned: 0, tasksClaimed: 0,
};
const on = { warmupOn: true };
const find = (stats: Partial<Stats>, key: string, opts = on) => buildBadges({ ...none, ...stats }, opts).find((b) => b.key === key)!;

describe('badges', () => {
  it('has 108 badges, in every group', () => {
    expect(BADGE_DEFS).toHaveLength(108);
    GROUPS.forEach((g) => expect(BADGE_DEFS.some((b) => b.group === g.key)).toBe(true));
  });
  it('keeps the keys of badges that could already have been shared', () => {
    const was = { 'first-ball': ['analyses', 1], 'net-regular': ['analyses', 10], technician: ['analyses', 50], 'twelfth-man': ['coachAiDays', 10], 'deep-breath': ['warmupDays', 1], settled: ['warmupDays', 10], unflappable: ['warmupDays', 30], 'mind-nets': ['mindWeeks', 1], 'full-course': ['mindWeeks', 6], 'opening-lesson': ['lessonsPassed', 1], student: ['lessonsPassed', 5], scholar: ['lessonsPassed', 15], 'good-call': ['questionsRight', 10], 'elite-panel': ['questionsRight', 50], 'winning-bid': ['auctionWins', 1], 'team-sheet': ['trainings', 1], 'club-regular': ['trainings', 10], 'heart-of-club': ['trainings', 25], 'off-the-mark': ['scoresEarned', 1], 'four-figures': ['scoresEarned', 1000], 'maiden-over': ['checkins', 6], 'half-century': ['checkins', 50], century: ['checkins', 100], 'quick-single': ['activeDays', 1], 'between-wickets': ['bestStepStreak', 7], 'run-chaser': ['tasksClaimed', 25], finisher: ['tasksClaimed', 100] } as const;
    for (const [key, [stat, target]] of Object.entries(was)) expect(BADGE_DEFS.find((b) => b.key === key)).toMatchObject({ stat, target });
  });
  it('climbs each ladder in order, within what can be reached', () => {
    const by = new Map<string, number[]>();
    BADGE_DEFS.forEach((b) => by.set(b.stat, [...(by.get(b.stat) ?? []), b.target]));
    by.forEach((t) => expect(t).toEqual([...t].sort((a, b) => a - b)));
    expect(Math.max(...by.get('lessonsPassed')!)).toBe(20);
    expect(Math.max(...by.get('mindWeeks')!)).toBe(6);
    expect(Math.max(...by.get('checkins')!)).toBeGreaterThan(7);
  });
  it('words every instruction and share line as a sentence', () => {
    BADGE_DEFS.forEach((b) => { expect(b.how).toMatch(/^[A-Z].*\.$/); expect(b.did).not.toMatch(/\b1 (days|times|lessons)\b/); });
  });
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
    expect(find({ analyses: 10 }, 'getting-set').earned).toBe(true);
  });
  it('never shows more progress than the target', () => {
    expect(find({ checkins: 400 }, 'maiden-over')).toMatchObject({ progress: 6, target: 6, earned: true });
  });
  it('gives an earned badge a message and a link that say nothing about the member', () => {
    const b = find({ checkins: 6 }, 'maiden-over');
    expect(b.share).toEqual({ message: 'I checked in on 6 days and earned the Maiden Over badge on ShiftUp 🏏', url: `${SHARE_BASE}/maiden-over` });
    BADGE_DEFS.forEach((d) => expect(shareMessage(d)).toMatch(/^I [a-z]/));
  });
  it('leaves Warm-Up badges out until Warm-Up rewards are on', () => {
    const off = buildBadges({ ...none, warmupDays: 40 }, { warmupOn: false });
    expect(off.some((b) => b.group === 'wellness')).toBe(false);
    expect(find({ mindWeeks: 6 }, 'full-course').earned).toBe(true);
  });
});
