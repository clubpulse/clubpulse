import {
  SOURCES, addDays, buildRewards, factsFrom, findReward, monthStart, weekStart,
  type Facts, type Values,
} from '@/lib/mobile/rewards-logic';

const VALUES: Values = { reward_daily: 5, reward_weekly: 15, reward_weekly_all: 30, reward_monthly: 40, reward_monthly_all: 100 };
// Wednesday 18 November 2026; the week began Monday 16th
const TODAY = '2026-11-18';
const empty = (over: Partial<Facts> = {}): Facts => ({
  today: TODAY, steps: [], checkins: [], auctions: [], clubActionThisWeek: false, claimed: [], ...over,
});
const ready = (facts: Facts, id: string) => findReward(buildRewards(facts, VALUES), id)!;

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

describe('daily rewards', () => {
  it('pays nothing for one goal, once for two and again for three', () => {
    const one = empty({ checkins: [TODAY] });
    expect(ready(one, 'daily:2').ready).toBe(false);

    const two = empty({ checkins: [TODAY], steps: [{ date: TODAY, count: 6000 }] });
    expect(ready(two, 'daily:2').ready).toBe(true);
    expect(ready(two, 'daily:3').ready).toBe(false);

    const three = empty({ ...two, auctions: [{ date: TODAY, place: 6 }] });
    expect(ready(three, 'daily:3').ready).toBe(true);
    expect(ready(three, 'daily:3').amount).toBe(5);
  });

  it('ignores yesterday and just-short step counts', () => {
    const facts = empty({ checkins: [addDays(TODAY, -1)], steps: [{ date: TODAY, count: 5999 }], auctions: [{ date: addDays(TODAY, -1), place: 1 }] });
    const daily = buildRewards(facts, VALUES).daily;
    expect(daily.goals.filter((g) => g.done)).toHaveLength(0);
    expect(daily.goals.find((g) => g.key === 'steps')!.progress).toBe(5999);
  });

  it('marks a reward claimed only for today', () => {
    const facts = empty({ checkins: [TODAY], steps: [{ date: TODAY, count: 9000 }] });
    const yesterday = { source: SOURCES.daily, reference: `${addDays(TODAY, -1)}:2`, date: addDays(TODAY, -1) };
    expect(ready({ ...facts, claimed: [yesterday] }, 'daily:2').claimed).toBe(false);
    const today = { source: SOURCES.daily, reference: `${TODAY}:2`, date: TODAY };
    expect(ready({ ...facts, claimed: [today] }, 'daily:2').claimed).toBe(true);
  });
});

describe('weekly rewards', () => {
  it('counts only this week, and each active day once', () => {
    const facts = empty({
      checkins: ['2026-11-15', '2026-11-16', '2026-11-17'], // Sunday is last week
      steps: [{ date: '2026-11-16', count: 9000 }, { date: '2026-11-18', count: 5000 }, { date: '2026-11-15', count: 20000 }],
      auctions: [{ date: '2026-11-17', place: 4 }],
    });
    const weekly = buildRewards(facts, VALUES).weekly;
    expect(weekly.goals.find((g) => g.key === 'active')!.progress).toBe(3);
    expect(weekly.goals.find((g) => g.key === 'steps')!.progress).toBe(14000);
    expect(weekly.goals.find((g) => g.key === 'podium')!.done).toBe(false);
  });

  it('needs a top-three finish this week for the podium goal', () => {
    expect(ready(empty({ auctions: [{ date: '2026-11-17', place: 3 }] }), 'weekly:podium').ready).toBe(true);
    expect(ready(empty({ auctions: [{ date: '2026-11-14', place: 1 }] }), 'weekly:podium').ready).toBe(false);
  });

  it('pays the bonus only when all four goals are done', () => {
    const days = ['2026-11-16', '2026-11-17', '2026-11-18'];
    const most = empty({
      checkins: days,
      steps: days.map((date) => ({ date, count: 14000 })),
      auctions: [{ date: '2026-11-16', place: 1 }],
    });
    // 3 active days and no club action: not there yet
    expect(ready(most, 'weekly:all').ready).toBe(false);
    expect(ready(most, 'weekly:steps').ready).toBe(true);

    const sunday = { ...most, today: '2026-11-22', checkins: [...days, '2026-11-19', '2026-11-20'], clubActionThisWeek: true };
    expect(ready(sunday, 'weekly:all').ready).toBe(true);
    expect(ready(sunday, 'weekly:all').amount).toBe(30);
    expect(buildRewards(sunday, VALUES).weekly.ends).toBe('Ends tonight');
  });
});

describe('monthly rewards', () => {
  it('counts active days and steps across the month, and weekly rewards claimed in it', () => {
    const days = Array.from({ length: 18 }, (_, i) => addDays('2026-11-01', i));
    const facts = empty({
      checkins: days,
      steps: days.map((date) => ({ date, count: 8500 })),
      claimed: [
        ...Array.from({ length: 8 }, (_, i) => ({ source: SOURCES.weekly, reference: `w${i}`, date: '2026-11-10' })),
        { source: SOURCES.weekly, reference: 'old', date: '2026-10-30' },
      ],
    });
    const monthly = buildRewards(facts, VALUES).monthly;
    expect(monthly.goals.map((g) => g.done)).toEqual([true, true, true]);
    expect(monthly.goals.find((g) => g.key === 'steps')!.progress).toBe(150000);
    expect(ready(facts, 'monthly:all').ready).toBe(true);
    expect(monthly.ends).toBe('12 days left');
  });

  it('does not count last month', () => {
    const facts = empty({ checkins: ['2026-10-30', '2026-10-31'], steps: [{ date: '2026-10-31', count: 150000 }] });
    expect(buildRewards(facts, VALUES).monthly.goals.every((g) => g.progress === 0)).toBe(true);
  });
});

describe('claims', () => {
  it('finds rewards by id and rejects ids that do not exist', () => {
    const rewards = buildRewards(empty(), VALUES);
    expect(findReward(rewards, 'weekly:club')!.reference).toBe('2026-11-16:club');
    expect(findReward(rewards, 'monthly:all')!.reference).toBe('2026-11');
    expect(findReward(rewards, 'daily:4')).toBeNull();
    expect(findReward(rewards, 'yearly:all')).toBeNull();
  });

  it('gives every reward a different ledger entry', () => {
    const rewards = buildRewards(empty(), VALUES);
    const all = [...rewards.daily.rewards, ...rewards.weekly.rewards, ...rewards.monthly.rewards];
    expect(new Set(all.map((r) => `${r.source}|${r.reference}`)).size).toBe(all.length);
    expect(all).toHaveLength(11);
  });
});
