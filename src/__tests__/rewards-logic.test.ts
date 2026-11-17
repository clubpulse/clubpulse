import {
  SOURCES, addDays, allRewards, buildRewards, factsFrom, findReward, monthStart, weekStart,
  type Facts, type Values,
} from '@/lib/mobile/rewards-logic';
import { QUIZ_BANK, dailyQuestionIndex } from '@/lib/scores/quiz-bank';

const VALUES: Values = {
  reward_daily: 5, reward_daily_all: 10, reward_weekly: 15, reward_weekly_all: 30, reward_weekly_extra: 10,
  reward_monthly: 40, reward_monthly_all: 100, reward_monthly_extra: 30,
};
// Wednesday 18 November 2026; the week began Monday 16th
const TODAY = '2026-11-18';
const empty = (over: Partial<Facts> = {}): Facts => ({
  today: TODAY, steps: [], checkins: [], auctions: [], coachAi: [], questions: [], clubActionThisWeek: false,
  shiftsDoneThisMonth: 0, trainingsThisMonth: 0, earnedThisWeek: 0, redemptionsThisMonth: 0, claimed: [], ...over,
});
const day = (date: string, count: number, streak = 1) => ({ date, count, streak });
const reward = (facts: Facts, id: string) => findReward(buildRewards(facts, VALUES), id)!;
const goal = (facts: Facts, period: 'daily' | 'weekly' | 'monthly', key: string) => {
  const p = buildRewards(facts, VALUES)[period];
  return [...p.goals, ...p.extras].find((g) => g.key === key)!;
};

describe('reward dates', () => {
  it('finds the Monday and the first of the month', () => {
    expect(weekStart('2026-11-18')).toBe('2026-11-16');
    expect(weekStart('2026-11-16')).toBe('2026-11-16');
    expect(weekStart('2026-11-22')).toBe('2026-11-16');
    expect(weekStart('2026-12-02')).toBe('2026-11-30');
    expect(monthStart('2026-11-18')).toBe('2026-11-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    // A week that began last month needs facts from before the 1st
    expect(factsFrom('2026-12-02')).toBe('2026-11-30');
    expect(factsFrom('2026-11-18')).toBe('2026-11-01');
  });
});

describe('the task list', () => {
  it('has five core tasks in each period, fifteen in all, every one different', () => {
    const r = buildRewards(empty(), VALUES);
    expect(r.daily.goals).toHaveLength(5);
    expect(r.weekly.goals).toHaveLength(5);
    expect(r.monthly.goals).toHaveLength(5);
    const titles = [...r.daily.goals, ...r.weekly.goals, ...r.monthly.goals].map((g) => g.title);
    expect(new Set(titles).size).toBe(15);
  });

  it('gives every reward its own id and its own ledger entry', () => {
    const all = allRewards(buildRewards(empty(), VALUES));
    // daily 2 bonuses; weekly 5 + 2 extras + 1 bonus; monthly 5 + 2 extras + 1 bonus
    expect(all).toHaveLength(18);
    expect(new Set(all.map((r) => r.id)).size).toBe(18);
    expect(new Set(all.map((r) => `${r.source}|${r.reference}`)).size).toBe(18);
    expect(findReward(buildRewards(empty(), VALUES), 'daily:4')).toBeNull();
  });
});

describe('daily tasks', () => {
  const three = empty({ checkins: [TODAY], steps: [day(TODAY, 6000)], questions: [{ date: TODAY, correct: false }] });

  it('pays nothing for two, once for three and again for all five', () => {
    expect(reward(empty({ checkins: [TODAY], steps: [day(TODAY, 6000)] }), 'daily:3').ready).toBe(false);
    expect(reward(three, 'daily:3').ready).toBe(true);
    expect(reward(three, 'daily:5').ready).toBe(false);
    const five = { ...three, coachAi: [TODAY], auctions: [{ date: TODAY, place: 6 }] };
    expect(reward(five, 'daily:5').ready).toBe(true);
    expect(reward(five, 'daily:5').amount).toBe(10);
  });

  it('counts a wrong answer to the daily question as done', () => {
    expect(goal(three, 'daily', 'question').done).toBe(true);
  });

  it('ignores yesterday and just-short step counts', () => {
    const y = addDays(TODAY, -1);
    const facts = empty({ checkins: [y], steps: [day(TODAY, 5999)], auctions: [{ date: y, place: 1 }], coachAi: [y], questions: [{ date: y, correct: true }] });
    const daily = buildRewards(facts, VALUES).daily;
    expect(daily.goals.filter((g) => g.done)).toHaveLength(0);
    expect(goal(facts, 'daily', 'steps').progress).toBe(5999);
  });

  it('marks a bonus claimed only for today', () => {
    const y = addDays(TODAY, -1);
    expect(reward({ ...three, claimed: [{ source: SOURCES.daily, reference: y, date: y }] }, 'daily:3').claimed).toBe(false);
    expect(reward({ ...three, claimed: [{ source: SOURCES.daily, reference: TODAY, date: TODAY }] }, 'daily:3').claimed).toBe(true);
  });
});

describe('weekly tasks', () => {
  it('uses the best single day for the big-day task, not the total', () => {
    const facts = empty({ steps: [day('2026-11-16', 7000), day('2026-11-17', 9999), day('2026-11-15', 20000)] });
    expect(goal(facts, 'weekly', 'bigday').done).toBe(false);
    expect(goal(facts, 'weekly', 'bigday').progress).toBe(9999);
    expect(goal(facts, 'weekly', 'steps').progress).toBe(16999); // the keep-going task adds them up
    expect(goal({ ...facts, steps: [...facts.steps, day(TODAY, 10000)] }, 'weekly', 'bigday').done).toBe(true);
  });

  it('needs right answers, this week, for the questions task', () => {
    const facts = empty({
      questions: [
        { date: '2026-11-15', correct: true }, // last week
        { date: '2026-11-16', correct: true }, { date: '2026-11-17', correct: false }, { date: TODAY, correct: true },
      ],
    });
    expect(goal(facts, 'weekly', 'quiz').progress).toBe(2);
  });

  it('needs a top-three finish this week for the podium task', () => {
    expect(reward(empty({ auctions: [{ date: '2026-11-17', place: 3 }] }), 'weekly:podium').ready).toBe(true);
    expect(reward(empty({ auctions: [{ date: '2026-11-17', place: 4 }] }), 'weekly:podium').ready).toBe(false);
    expect(reward(empty({ auctions: [{ date: '2026-11-14', place: 1 }] }), 'weekly:podium').ready).toBe(false);
  });

  it('pays each task on its own and the bonus only for all five', () => {
    const four = empty({
      clubActionThisWeek: true,
      steps: [day('2026-11-16', 12000)],
      auctions: [{ date: '2026-11-16', place: 1 }],
      earnedThisWeek: 140,
      questions: [{ date: '2026-11-16', correct: true }],
    });
    expect(reward(four, 'weekly:earn').ready).toBe(true);
    expect(reward(four, 'weekly:earn').amount).toBe(15);
    expect(reward(four, 'weekly:all').ready).toBe(false);
    const five = { ...four, questions: ['2026-11-16', '2026-11-17', TODAY].map((date) => ({ date, correct: true })) };
    expect(reward(five, 'weekly:all').ready).toBe(true);
    // Keep-going tasks are separate and do not hold up the bonus
    expect(reward(five, 'weekly:active').ready).toBe(false);
    expect(reward(five, 'weekly:active').source).toBe(SOURCES.weeklyExtra);
  });
});

describe('monthly tasks', () => {
  it('needs a win, not a podium', () => {
    expect(reward(empty({ auctions: [{ date: '2026-11-05', place: 2 }] }), 'monthly:win').ready).toBe(false);
    expect(reward(empty({ auctions: [{ date: '2026-11-05', place: 1 }] }), 'monthly:win').ready).toBe(true);
    expect(reward(empty({ auctions: [{ date: '2026-10-31', place: 1 }] }), 'monthly:win').ready).toBe(false);
  });

  it('reads the step streak from this month only', () => {
    expect(goal(empty({ steps: [day('2026-11-10', 3000, 6)] }), 'monthly', 'streak').done).toBe(false);
    expect(goal(empty({ steps: [day('2026-11-10', 3000, 7)] }), 'monthly', 'streak').done).toBe(true);
    expect(goal(empty({ steps: [day('2026-10-31', 3000, 30)] }), 'monthly', 'streak').progress).toBe(0);
  });

  it('counts turning up as one completed shift or two training sessions', () => {
    expect(goal(empty({ trainingsThisMonth: 1 }), 'monthly', 'turnup').done).toBe(false);
    expect(goal(empty({ trainingsThisMonth: 2 }), 'monthly', 'turnup').done).toBe(true);
    expect(goal(empty({ shiftsDoneThisMonth: 1 }), 'monthly', 'turnup').done).toBe(true);
  });

  it('counts a redemption, active days and the keep-going tasks', () => {
    const days = Array.from({ length: 18 }, (_, i) => addDays('2026-11-01', i));
    const facts = empty({
      checkins: days,
      steps: days.map((date) => day(date, 8500)),
      redemptionsThisMonth: 2,
      claimed: [
        ...Array.from({ length: 10 }, (_, i) => ({ source: SOURCES.weekly, reference: `w${i}`, date: '2026-11-10' })),
        { source: SOURCES.weekly, reference: 'old', date: '2026-10-30' },
        { source: SOURCES.weeklyExtra, reference: 'x', date: '2026-11-10' },
      ],
    });
    expect(goal(facts, 'monthly', 'redeem').done).toBe(true);
    expect(goal(facts, 'monthly', 'active').done).toBe(true);
    expect(goal(facts, 'monthly', 'steps').progress).toBe(150000);
    expect(goal(facts, 'monthly', 'weeklies').progress).toBe(10);
    expect(reward(facts, 'monthly:all').ready).toBe(false); // no win, streak or turning up yet
    expect(buildRewards(facts, VALUES).monthly.ends).toBe('12 days left');
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
    expect(dailyQuestionIndex('2026-11-18')).toBe(dailyQuestionIndex('2026-11-18'));
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
