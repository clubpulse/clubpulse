import { parseTaskSettings, taskLine, untilNextCard } from '@/lib/scratch/tasks';

describe('scratch card tasks', () => {
  it('accepts valid settings', () => {
    const res = parseTaskSettings([{ task: 'academy_lesson', every_n: 5, is_active: true }, { task: 'volunteer_shift', every_n: 1, is_active: false }], 2);
    expect(res).toEqual({
      tasks: [{ task: 'academy_lesson', every_n: 5, is_active: true }, { task: 'volunteer_shift', every_n: 1, is_active: false }],
      weeklyCap: 2,
    });
  });

  it('refuses unknown or repeated tasks', () => {
    expect(parseTaskSettings([{ task: 'buy_card', every_n: 1, is_active: true }], 2)).toHaveProperty('error');
    expect(parseTaskSettings([{ task: 'academy_lesson', every_n: 1, is_active: true }, { task: 'academy_lesson', every_n: 2, is_active: true }], 2)).toHaveProperty('error');
    expect(parseTaskSettings([{ task: 'game', every_n: 3, is_active: true }], 2)).toEqual({ tasks: [{ task: 'game', every_n: 3, is_active: true }], weeklyCap: 2 });
  });

  it('refuses numbers out of range', () => {
    expect(parseTaskSettings([{ task: 'academy_lesson', every_n: 0, is_active: true }], 2)).toHaveProperty('error');
    expect(parseTaskSettings([{ task: 'academy_lesson', every_n: 2.5, is_active: true }], 2)).toHaveProperty('error');
    expect(parseTaskSettings([{ task: 'academy_lesson', every_n: 101, is_active: true }], 2)).toHaveProperty('error');
    expect(parseTaskSettings([], 21)).toHaveProperty('error');
    expect(parseTaskSettings([], -1)).toHaveProperty('error');
    expect(parseTaskSettings('x', 2)).toHaveProperty('error');
  });

  it('only switches a task on when told to', () => {
    const res = parseTaskSettings([{ task: 'video_analysis', every_n: 3, is_active: 'yes' }], 0);
    expect(res).toEqual({ tasks: [{ task: 'video_analysis', every_n: 3, is_active: false }], weeklyCap: 0 });
  });

  it('counts down to the next card', () => {
    expect(untilNextCard(0, 5)).toBe(5);
    expect(untilNextCard(3, 5)).toBe(2);
    expect(untilNextCard(5, 5)).toBe(5);
    expect(untilNextCard(7, 1)).toBe(1);
  });

  it('describes a task for the member', () => {
    expect(taskLine('volunteer_shift', 1, 4)).toBe('Every volunteer shift you turn up for is a card.');
    expect(taskLine('academy_lesson', 5, 3)).toBe('Every 5 Academy lessons you pass is a card. 2 to go.');
    expect(taskLine('video_analysis', 5, 0)).toBe('Every 5 days you analyse a video is a card. 5 to go.');
    expect(taskLine('game', 3, 1)).toBe('Every 3 perfect rounds or league titles in the games is a card. 2 to go.');
  });
});
