import {
  DEFAULT_DAILY_STEPS, SOURCES, addDays, allRewards, buildRewards, dailyPool, draw, factsFrom, findReward, monthStart,
  monthlyPool, progressFrom, stepTarget, usualSteps, weekStart, weeklyPool,
  type Facts, type Goal, type Values,
} from '@/lib/mobile/rewards-logic';
import { QUIZ_BANK, dailyQuestionIndex } from '@/lib/scores/quiz-bank';

const VALUES: Values = {
  reward_daily: 5, reward_daily_all: 10, reward_weekly: 15, reward_weekly_all: 30, reward_weekly_extra: 10,
  reward_monthly: 40, reward_monthly_all: 100, reward_monthly_extra: 30,
};
// Wednesday 18 November 2026; the week began Monday 16th
const TODAY = '2026-11-18';
const empty = (over: Partial<Facts> = {}): Facts => ({
  today: TODAY, steps: [], checkins: [], auctions: [], coachAi: [], questions: [], lessonAttempts: [], lessonPasses: [],
  plansMade: [], clubActionThisWeek: false, shiftsDoneThisMonth: 0, trainingsThisMonth: 0, earnedThisWeek: 0,
  earnedThisMonth: 0, redemptionsThisMonth: 0, claimed: [], ...over,
});
const day = (date: string, count: number, streak = 1) => ({ date, count, streak });
const auction = (date: string, place: number, score = 1300) => ({ date, place, score });
const task = (pool: Goal[], key: string) => pool.find((g) => g.key === key)!;
const history = (count: number, days = 20, before = TODAY) => Array.from({ length: days }, (_, i) => day(addDays(before, -(i + 2)), count));

describe('reward dates', () => {
  it('finds the Monday, the first of the month and how far back to read', () => {
    expect(weekStart('2026-11-18')).toBe('2026-11-16');
    expect(weekStart('2026-11-22')).toBe('2026-11-16');
    expect(weekStart('2026-12-02')).toBe('2026-11-30');
    expect(monthStart('2026-11-18')).toBe('2026-11-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(progressFrom('2026-12-02')).toBe('2026-11-30'); // the week began last month
    expect(progressFrom('2026-11-18')).toBe('2026-11-01');
    expect(factsFrom('2026-11-18')).toBe('2026-10-03'); // 29 days before the 1st, for step targets
  });
});

describe('the draw', () => {
  const user = 'user-a';
  const names = (goals: Goal[]) => goals.map((g) => g.key);

  it('gives five tasks a period: two habits plus three daily, and one of each kind weekly and monthly', () => {
    const r = buildRewards(empty(), VALUES, user);
    expect(r.daily.goals.map((g) => g.kind)).toEqual(['habit', 'habit', 'move', 'learn', 'play']);
    expect(names(r.daily.goals).slice(0, 2).sort()).toEqual(['checkin', 'question']);
    expect(r.weekly.goals.map((g) => g.kind)).toEqual(['move', 'learn', 'play', 'club', 'grow']);
    expect(r.monthly.goals.map((g) => g.kind)).toEqual(['move', 'learn', 'play', 'club', 'grow']);
  });

  it('adds two extras that are not among the five and are of different kinds', () => {
    const r = buildRewards(empty(), VALUES, user);
    for (const p of [r.weekly, r.monthly]) {
      expect(p.extras).toHaveLength(2);
      expect(p.extras[0].kind).not.toBe(p.extras[1].kind);
      p.extras.forEach((e) => expect(names(p.goals)).not.toContain(e.key));
    }
    expect(r.daily.extras).toHaveLength(0);
  });

  it('is the same every time for the same person and period', () => {
    expect(names(buildRewards(empty(), VALUES, user).weekly.goals)).toEqual(names(buildRewards(empty(), VALUES, user).weekly.goals));
  });

  it('changes from day to day, week to week, month to month and person to person', () => {
    const sets = (pick: (f: Facts, who: string) => Goal[], facts: Facts[], who = [user]) =>
      new Set(facts.flatMap((f) => who.map((w) => names(pick(f, w)).join(',')))).size;
    const days = Array.from({ length: 14 }, (_, i) => empty({ today: addDays(TODAY, i) }));
    const weeks = Array.from({ length: 8 }, (_, i) => empty({ today: addDays(TODAY, i * 7) }));
    const months = ['2026-11-18', '2026-12-18', '2027-01-18', '2027-02-18', '2027-03-18', '2027-04-18'].map((today) => empty({ today }));
    expect(sets((f, w) => buildRewards(f, VALUES, w).daily.goals, days)).toBeGreaterThan(4);
    expect(sets((f, w) => buildRewards(f, VALUES, w).weekly.goals, weeks)).toBeGreaterThan(5);
    expect(sets((f, w) => buildRewards(f, VALUES, w).monthly.goals, months)).toBeGreaterThan(3);
    const people = Array.from({ length: 12 }, (_, i) => `user-${i}`);
    expect(sets((f, w) => buildRewards(f, VALUES, w).weekly.goals, [empty()], people)).toBeGreaterThan(6);
  });

  it('does not change part-way through a period as the person makes progress', () => {
    const start = buildRewards(empty(), VALUES, user);
    const later = buildRewards(
      empty({
        steps: [...history(9000), day('2026-11-16', 15000, 9), day('2026-11-17', 12000, 10), day(TODAY, 8000, 11)],
        checkins: ['2026-11-16', '2026-11-17', TODAY],
        auctions: [auction('2026-11-17', 1, 1460), auction(TODAY, 2, 1440)],
        coachAi: [TODAY], questions: [{ date: TODAY, correct: true }], lessonAttempts: [TODAY], lessonPasses: [TODAY],
        plansMade: [TODAY], clubActionThisWeek: true, earnedThisWeek: 400, earnedThisMonth: 900, redemptionsThisMonth: 1,
      }),
      VALUES,
      user,
    );
    for (const p of ['daily', 'weekly', 'monthly'] as const) {
      expect(names(later[p].goals)).toEqual(names(start[p].goals));
      expect(names(later[p].extras)).toEqual(names(start[p].extras));
    }
  });

  it('keeps the rest of a draw in place when a task is added to the pool', () => {
    const pool = weeklyPool(empty());
    const kinds = ['move', 'learn', 'play', 'club', 'grow'] as const;
    const before = draw(pool, kinds, 'seed');
    const extra: Goal = { ...pool[0], key: 'brand-new', kind: 'grow' };
    const after = draw([...pool, extra], kinds, 'seed');
    // Only the grow place could change, and only to the new task
    expect(names(after.picked).slice(0, 4)).toEqual(names(before.picked).slice(0, 4));
  });

  it('gives every reward its own id and its own ledger entry', () => {
    for (let i = 0; i < 30; i++) {
      const all = allRewards(buildRewards(empty({ today: addDays(TODAY, i * 3) }), VALUES, `user-${i}`));
      // daily 2 bonuses; weekly 5 + 2 extras + 1 bonus; monthly 5 + 2 extras + 1 bonus
      expect(all).toHaveLength(18);
      expect(new Set(all.map((r) => r.id)).size).toBe(18);
      expect(new Set(all.map((r) => `${r.source}|${r.reference}`)).size).toBe(18);
    }
    expect(findReward(buildRewards(empty(), VALUES, user), 'daily:4')).toBeNull();
  });
});

describe('personal step targets', () => {
  it('uses the default until there are three days of walking to go on', () => {
    expect(usualSteps(empty({ steps: [day('2026-11-10', 9000), day('2026-11-11', 9000)] }), TODAY)).toBeNull();
    expect(stepTarget(null)).toBe(DEFAULT_DAILY_STEPS);
  });

  it('sets the target a little above the usual, within limits', () => {
    expect(stepTarget(5000)).toBe(5500);
    expect(stepTarget(9000)).toBe(10000);
    expect(stepTarget(1200)).toBe(4000);
    expect(stepTarget(25000)).toBe(12000);
  });

  it('ignores today and yesterday, so a late sync cannot move the target', () => {
    const base = empty({ steps: history(8000) });
    const withRecent = empty({ steps: [...history(8000), day(addDays(TODAY, -1), 30000), day(TODAY, 30000)] });
    expect(usualSteps(withRecent, TODAY)).toBe(usualSteps(base, TODAY));
    expect(task(dailyPool(withRecent), 'steps').target).toBe(9000);
  });

  it('gives a regular walker bigger targets than a beginner', () => {
    const walker = empty({ steps: history(11000, 26) });
    const beginner = empty({ steps: history(3000, 26) });
    expect(task(dailyPool(walker), 'steps').target).toBe(12000);
    expect(task(dailyPool(beginner), 'steps').target).toBe(4000);
    expect(task(weeklyPool(walker), 'steps').target).toBeGreaterThan(task(weeklyPool(beginner), 'steps').target);
    expect(task(monthlyPool(walker), 'steps').target).toBeGreaterThan(task(monthlyPool(beginner), 'steps').target);
  });
});

describe('daily tasks', () => {
  it('reads each task from today only', () => {
    const y = addDays(TODAY, -1);
    const stale = dailyPool(empty({ checkins: [y], questions: [{ date: y, correct: true }], coachAi: [y], lessonAttempts: [y], auctions: [auction(y, 1, 1500)] }));
    expect(stale.filter((g) => g.done)).toHaveLength(0);
    const fresh = dailyPool(empty({
      checkins: [TODAY], questions: [{ date: TODAY, correct: false }], coachAi: [TODAY], lessonAttempts: [TODAY],
      auctions: [auction(TODAY, 4, 1400)], steps: [day(TODAY, 6000)],
    }));
    expect(fresh.filter((g) => g.done).map((g) => g.key).sort()).toEqual(['auction', 'auction-strong', 'auction-top4', 'beat-yesterday', 'checkin', 'coach', 'lesson', 'question', 'steps']);
  });

  it('separates finishing, top four and a strong score in the auction', () => {
    const pool = dailyPool(empty({ auctions: [auction(TODAY, 5, 1399)] }));
    expect(task(pool, 'auction').done).toBe(true);
    expect(task(pool, 'auction-top4').done).toBe(false);
    expect(task(pool, 'auction-strong').done).toBe(false);
  });

  it('asks for one step more than yesterday, or 2,000 after a quiet day', () => {
    const y = addDays(TODAY, -1);
    expect(task(dailyPool(empty({ steps: [day(y, 7200), day(TODAY, 7200)] })), 'beat-yesterday').done).toBe(false);
    expect(task(dailyPool(empty({ steps: [day(y, 7200), day(TODAY, 7201)] })), 'beat-yesterday').done).toBe(true);
    expect(task(dailyPool(empty({ steps: [day(y, 300)] })), 'beat-yesterday').target).toBe(2000);
  });

  it('pays for three of the five and again for all five', () => {
    const who = 'user-a';
    const picked = buildRewards(empty(), VALUES, who).daily.goals.map((g) => g.key);
    // Facts that complete everything in the pool
    const all = empty({
      checkins: [TODAY], questions: [{ date: TODAY, correct: true }], coachAi: [TODAY], lessonAttempts: [TODAY],
      auctions: [auction(TODAY, 1, 1500)], steps: [day(TODAY, 20000)],
    });
    const done = buildRewards(all, VALUES, who);
    expect(done.daily.goals.map((g) => g.key)).toEqual(picked);
    expect(findReward(done, 'daily:5')).toMatchObject({ ready: true, amount: 10 });
    const two = buildRewards(empty({ checkins: [TODAY], questions: [{ date: TODAY, correct: true }] }), VALUES, who);
    expect(findReward(two, 'daily:3')!.ready).toBe(false);
    const claimed = buildRewards({ ...all, claimed: [{ source: SOURCES.daily, reference: TODAY, date: TODAY }] }, VALUES, who);
    expect(findReward(claimed, 'daily:3')!.claimed).toBe(true);
    expect(findReward(claimed, 'daily:5')!.claimed).toBe(false);
  });
});

describe('weekly tasks', () => {
  it('counts only this week', () => {
    const pool = weeklyPool(empty({
      steps: [day('2026-11-15', 20000), day('2026-11-16', 7000), day('2026-11-17', 9999)],
      questions: [{ date: '2026-11-15', correct: true }, { date: '2026-11-16', correct: true }, { date: '2026-11-17', correct: false }],
      auctions: [auction('2026-11-14', 1, 1500), auction('2026-11-17', 4, 1410)],
      coachAi: ['2026-11-15', '2026-11-16', '2026-11-16'], lessonPasses: ['2026-11-15', '2026-11-17'], plansMade: ['2026-11-15'],
      checkins: ['2026-11-15', '2026-11-16'],
    }));
    expect(task(pool, 'bigday').progress).toBe(9999);
    expect(task(pool, 'steps').progress).toBe(16999);
    expect(task(pool, 'quiz').progress).toBe(1);
    expect(task(pool, 'podium').done).toBe(false);
    expect(task(pool, 'auctions').progress).toBe(1);
    expect(task(pool, 'auction-strong').progress).toBe(1410);
    expect(task(pool, 'coach-days').progress).toBe(1); // two asks on one day count once
    expect(task(pool, 'lessons').progress).toBe(1);
    expect(task(pool, 'plan').done).toBe(false);
    expect(task(pool, 'checkins').progress).toBe(1);
  });

  it('counts the weekend, days on target and daily rewards claimed', () => {
    const sunday = empty({
      today: '2026-11-22',
      steps: [day('2026-11-16', 6000), day('2026-11-17', 6100), day('2026-11-19', 5999), day('2026-11-21', 5000), day('2026-11-22', 5200)],
      claimed: ['2026-11-16', '2026-11-17', '2026-11-19', '2026-11-20'].map((d) => ({ source: SOURCES.daily, reference: d, date: d })),
    });
    const pool = weeklyPool(sunday);
    expect(task(pool, 'weekend').done).toBe(true);
    expect(task(pool, 'target-days').progress).toBe(2);
    expect(task(pool, 'dailies').done).toBe(true);
  });

  it('pays each drawn task on its own and the bonus only for all five', () => {
    const who = 'user-a';
    const everything = empty({
      today: '2026-11-22',
      steps: ['16', '17', '18', '19', '20', '21', '22'].map((d, i) => day(`2026-11-${d}`, 16000, i + 1)),
      checkins: ['16', '17', '18', '19', '20'].map((d) => `2026-11-${d}`),
      auctions: ['16', '17', '18', '19'].map((d) => auction(`2026-11-${d}`, 1, 1500)),
      questions: ['16', '17', '18'].map((d) => ({ date: `2026-11-${d}`, correct: true })),
      coachAi: ['2026-11-16', '2026-11-17', '2026-11-18'], lessonPasses: ['2026-11-16', '2026-11-17'], plansMade: ['2026-11-16'],
      clubActionThisWeek: true, earnedThisWeek: 300,
      claimed: ['16', '17', '18', '19'].map((d) => ({ source: SOURCES.daily, reference: `2026-11-${d}`, date: `2026-11-${d}` })),
    });
    const r = buildRewards(everything, VALUES, who);
    r.weekly.goals.forEach((g) => expect(g.reward).toMatchObject({ ready: true, amount: 15, source: SOURCES.weekly }));
    r.weekly.extras.forEach((g) => expect(g.reward).toMatchObject({ ready: true, amount: 10, source: SOURCES.weeklyExtra }));
    expect(findReward(r, 'weekly:all')).toMatchObject({ ready: true, amount: 30 });
    expect(findReward(buildRewards(empty({ today: '2026-11-22' }), VALUES, who), 'weekly:all')!.ready).toBe(false);
  });
});

describe('monthly tasks', () => {
  it('reads wins, podiums, streaks and turning up from this month only', () => {
    const pool = monthlyPool(empty({
      auctions: [auction('2026-10-31', 1), auction('2026-11-03', 2), auction('2026-11-05', 3), auction('2026-11-09', 4)],
      steps: [day('2026-10-31', 12000, 30), day('2026-11-10', 3000, 6), day('2026-11-11', 10000, 7)],
      trainingsThisMonth: 1,
    }));
    expect(task(pool, 'win').done).toBe(false);
    expect(task(pool, 'podiums').progress).toBe(2);
    expect(task(pool, 'auctions').progress).toBe(3);
    expect(task(pool, 'streak').done).toBe(true);
    expect(task(pool, 'bigdays').progress).toBe(1);
    expect(task(pool, 'turnup').done).toBe(false);
    expect(task(monthlyPool(empty({ shiftsDoneThisMonth: 1 })), 'turnup').done).toBe(true);
    expect(task(monthlyPool(empty({ trainingsThisMonth: 2 })), 'turnup').done).toBe(true);
  });

  it('counts lessons, questions, redemptions, weekly tasks and Scores earned', () => {
    const pool = monthlyPool(empty({
      lessonPasses: ['2026-11-02', '2026-11-09', '2026-10-30'],
      questions: Array.from({ length: 14 }, (_, i) => ({ date: addDays('2026-11-01', i), correct: i % 7 !== 0 })),
      redemptionsThisMonth: 2, earnedThisMonth: 640,
      claimed: [
        ...Array.from({ length: 10 }, (_, i) => ({ source: SOURCES.weekly, reference: `w${i}`, date: '2026-11-10' })),
        { source: SOURCES.weekly, reference: 'old', date: '2026-10-30' },
        { source: SOURCES.weeklyExtra, reference: 'x', date: '2026-11-10' },
      ],
    }));
    expect(task(pool, 'lessons').progress).toBe(2);
    expect(task(pool, 'quiz').done).toBe(true);
    expect(task(pool, 'redeem').done).toBe(true);
    expect(task(pool, 'weeklies').progress).toBe(10);
    expect(task(pool, 'earn').done).toBe(true);
  });
});

describe('daily question', () => {
  it('picks a valid question for every day and varies it', () => {
    const picks = Array.from({ length: 60 }, (_, i) => dailyQuestionIndex(addDays('2026-11-01', i)));
    picks.forEach((i) => {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(QUIZ_BANK.length);
    });
    expect(new Set(picks).size).toBeGreaterThan(25);
  });

  it('has three options and a valid answer for every question, with no repeats', () => {
    QUIZ_BANK.forEach((question) => {
      expect(question.options).toHaveLength(3);
      expect(new Set(question.options).size).toBe(3);
      expect([0, 1, 2]).toContain(question.answer);
    });
    expect(new Set(QUIZ_BANK.map((question) => question.q)).size).toBe(QUIZ_BANK.length);
  });
});
