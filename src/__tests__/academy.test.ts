import { LESSONS, TRACKS, getLesson } from '@/lib/academy/content';
import {
  buildOverview, cleanPlan, levelFor, libraryPlan, mark, parseAnswers, parsePlanRequest, publicLesson, trackComplete,
  type PlanRequest,
} from '@/lib/academy/logic';

const REQUEST: PlanRequest = { focus: 'bowling more accurately', role: 'bowler', sessions: 3, minutes: 30 };

describe('academy content', () => {
  it('has five lessons in each of the four tracks, with unique ids', () => {
    expect(LESSONS).toHaveLength(20);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(20);
    TRACKS.forEach((t) => expect(LESSONS.filter((l) => l.track === t.key)).toHaveLength(5));
    LESSONS.forEach((l) => expect(l.id.startsWith(`${l.track}-`)).toBe(true));
  });

  it('gives every lesson real content and three well-formed questions', () => {
    LESSONS.forEach((l) => {
      expect(l.intro.length).toBeGreaterThan(40);
      expect(l.points.length).toBeGreaterThanOrEqual(4);
      expect(l.tryIt.length).toBeGreaterThan(40);
      expect(l.quiz).toHaveLength(3);
      l.quiz.forEach((item) => {
        expect(new Set(item.options).size).toBe(3);
        expect([0, 1, 2]).toContain(item.answer);
        expect(item.why.length).toBeGreaterThan(10);
      });
    });
  });

  it('does not always put the right answer in the same place', () => {
    const positions = LESSONS.flatMap((l) => l.quiz.map((item) => item.answer));
    [0, 1, 2].forEach((p) => expect(positions.filter((x) => x === p).length).toBeGreaterThan(3));
  });

  it('never sends answers to the app', () => {
    const sent = JSON.stringify(publicLesson(LESSONS[0]));
    expect(sent).not.toContain('"answer"');
    expect(sent).not.toContain('"why"');
    expect(sent).not.toContain(LESSONS[0].quiz[0].why);
  });
});

describe('marking', () => {
  const lesson = getLesson('game-lbw')!;
  const right = lesson.quiz.map((item) => item.answer);

  it('passes on two or three right and fails on fewer', () => {
    expect(mark(lesson, right)).toMatchObject({ score: 3, passed: true });
    expect(mark(lesson, [right[0], right[1], (right[2] + 1) % 3])).toMatchObject({ score: 2, passed: true });
    expect(mark(lesson, [right[0], (right[1] + 1) % 3, (right[2] + 1) % 3])).toMatchObject({ score: 1, passed: false });
  });

  it('accepts only three answers of 0, 1 or 2', () => {
    expect(parseAnswers({ answers: [0, 1, 2] })).toEqual([0, 1, 2]);
    expect(parseAnswers({ answers: [0, 1] })).toBeNull();
    expect(parseAnswers({ answers: [0, 1, 3] })).toBeNull();
    expect(parseAnswers({ answers: ['0', 1, 2] })).toBeNull();
    expect(parseAnswers(null)).toBeNull();
  });
});

describe('progress and levels', () => {
  it('moves up through the levels', () => {
    expect(levelFor(0)).toMatchObject({ title: 'New starter', next: { title: 'Net regular', at: 3 } });
    expect(levelFor(3).title).toBe('Net regular');
    expect(levelFor(11).title).toBe('Second XI');
    expect(levelFor(20)).toMatchObject({ title: 'Club legend', next: null });
  });

  it('builds the overview from what has been passed', () => {
    const overview = buildOverview([
      { lessonId: 'skills-catching', bestScore: 3, passed: true },
      { lessonId: 'skills-grip-stance', bestScore: 1, passed: false },
    ]);
    expect(overview.level.passed).toBe(1);
    const skills = overview.tracks.find((t) => t.key === 'skills')!;
    expect(skills).toMatchObject({ done: 1, total: 5 });
    expect(skills.lessons.find((l) => l.id === 'skills-grip-stance')).toMatchObject({ passed: false, bestScore: 1 });
    expect(skills.lessons.find((l) => l.id === 'skills-front-foot-drive')!.bestScore).toBeNull();
  });

  it('knows when a track is finished', () => {
    const body = LESSONS.filter((l) => l.track === 'body').map((l) => l.id);
    expect(trackComplete('body', new Set(body))).toBe(true);
    expect(trackComplete('body', new Set(body.slice(1)))).toBe(false);
  });
});

describe('personal plans', () => {
  it('validates the request', () => {
    expect(parsePlanRequest({ focus: '  playing   spin ', role: 'batter', sessions: 3, minutes: 30 })).toEqual({ focus: 'playing spin', role: 'batter', sessions: 3, minutes: 30 });
    expect(typeof parsePlanRequest({ focus: 'x', role: 'batter', sessions: 3, minutes: 30 })).toBe('string');
    expect(typeof parsePlanRequest({ focus: 'a'.repeat(201), role: 'batter', sessions: 3, minutes: 30 })).toBe('string');
    expect(typeof parsePlanRequest({ focus: 'spin', role: 'wizard', sessions: 3, minutes: 30 })).toBe('string');
    expect(typeof parsePlanRequest({ focus: 'spin', role: 'batter', sessions: 9, minutes: 30 })).toBe('string');
    expect(typeof parsePlanRequest({ focus: 'spin', role: 'batter', sessions: 3, minutes: 20 })).toBe('string');
  });

  it('builds a library plan that fits the focus, skips passed lessons and has the right number of days', () => {
    const plan = libraryPlan(REQUEST, new Set());
    expect(plan.days).toHaveLength(3);
    expect(plan.days[0].lessonId).toBe('skills-bowling-action');
    expect(new Set(plan.days.map((d) => d.lessonId)).size).toBe(3);
    plan.days.forEach((d) => expect(d.minutes).toBe(30));

    const after = libraryPlan(REQUEST, new Set(['skills-bowling-action']));
    expect(after.days.map((d) => d.lessonId)).not.toContain('skills-bowling-action');
    // Even with everything passed there is still a plan
    expect(libraryPlan({ ...REQUEST, sessions: 5 }, new Set(LESSONS.map((l) => l.id))).days).toHaveLength(5);
  });

  it('tidies a good AI plan and drops lesson ids that do not exist', () => {
    const raw = {
      summary: 'A week on hitting a good length.',
      days: [
        { title: 'Target practice', activity: 'Bowl 18 balls at a towel on a good length and count your hits.', lessonId: 'skills-bowling-action' },
        { title: 'Made-up lesson', activity: 'Bowl 12 balls from a standing start, aiming at one stump.', lessonId: 'skills-does-not-exist' },
        { title: 'No lesson', activity: 'Ten minutes of catching against a wall with a tennis ball.', lessonId: null },
      ],
    };
    const plan = cleanPlan(raw, REQUEST)!;
    expect(plan.days.map((d) => d.lessonId)).toEqual(['skills-bowling-action', null, null]);
    expect(plan.days[0].lessonTitle).toBe('A bowling action you can repeat');
    expect(plan.days.map((d) => d.day)).toEqual([1, 2, 3]);
  });

  it('rejects AI plans that are the wrong shape', () => {
    const day = { title: 'Session', activity: 'Bowl 18 balls at a towel on a good length.', lessonId: null };
    expect(cleanPlan(null, REQUEST)).toBeNull();
    expect(cleanPlan({ summary: 'ok', days: [day, day] }, REQUEST)).toBeNull(); // too few days
    expect(cleanPlan({ summary: '', days: [day, day, day] }, REQUEST)).toBeNull(); // no summary
    expect(cleanPlan({ summary: 'ok', days: [day, day, { ...day, activity: 'Bowl.' }] }, REQUEST)).toBeNull(); // empty activity
    expect(cleanPlan({ summary: 'ok', days: 'three' }, REQUEST)).toBeNull();
  });

  it('cuts overlong AI text down to size', () => {
    const day = { title: 'T'.repeat(200), activity: 'A'.repeat(2000), lessonId: null };
    const plan = cleanPlan({ summary: 'S'.repeat(1000), days: [day, day, day] }, REQUEST)!;
    expect(plan.summary).toHaveLength(300);
    expect(plan.days[0].title).toHaveLength(60);
    expect(plan.days[0].activity).toHaveLength(500);
  });
});
