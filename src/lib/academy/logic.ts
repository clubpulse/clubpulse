// The Academy's rules, with no database or AI access so they can be tested.

import { LESSONS, TRACKS, getLesson, type Lesson, type TrackKey } from '@/lib/academy/content';

export const PASS_MARK = 2; // right answers out of three
export const PLAN_LIMIT_PER_WEEK = 3;
export const ROLES = ['batter', 'bowler', 'all-rounder', 'keeper', 'new'] as const;
export type PlayerRole = (typeof ROLES)[number];

export type Progress = { lessonId: string; bestScore: number; passed: boolean };

const LEVELS: Array<{ at: number; title: string }> = [
  { at: 0, title: 'New starter' },
  { at: 3, title: 'Net regular' },
  { at: 7, title: 'Second XI' },
  { at: 12, title: 'First XI' },
  { at: 17, title: 'Club captain' },
  { at: LESSONS.length, title: 'Club legend' },
];

export function levelFor(passed: number) {
  const current = [...LEVELS].reverse().find((l) => passed >= l.at) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.at > passed) ?? null;
  return { title: current.title, passed, total: LESSONS.length, next: next ? { title: next.title, at: next.at } : null };
}

export type Overview = {
  level: ReturnType<typeof levelFor>;
  tracks: Array<{
    key: TrackKey;
    icon: string;
    title: string;
    blurb: string;
    done: number;
    total: number;
    lessons: Array<{ id: string; title: string; minutes: number; passed: boolean; bestScore: number | null }>;
  }>;
};

export function buildOverview(progress: Progress[]): Overview {
  const byId = new Map(progress.map((p) => [p.lessonId, p]));
  const tracks = TRACKS.map((t) => {
    const lessons = LESSONS.filter((l) => l.track === t.key).map((l) => ({
      id: l.id,
      title: l.title,
      minutes: l.minutes,
      passed: byId.get(l.id)?.passed ?? false,
      bestScore: byId.get(l.id)?.bestScore ?? null,
    }));
    return { ...t, done: lessons.filter((l) => l.passed).length, total: lessons.length, lessons };
  });
  return { level: levelFor(tracks.reduce((a, t) => a + t.done, 0)), tracks };
}

/** What the app is sent for a lesson: everything except the answers. */
export function publicLesson(lesson: Lesson) {
  const track = TRACKS.find((t) => t.key === lesson.track)!;
  return {
    id: lesson.id,
    track: lesson.track,
    trackTitle: track.title,
    title: lesson.title,
    minutes: lesson.minutes,
    intro: lesson.intro,
    points: lesson.points,
    tryIt: lesson.tryIt,
    questions: lesson.quiz.map((item) => ({ q: item.q, options: [...item.options] })),
  };
}

/** Reads the answers the app sent: exactly one choice of 0, 1 or 2 per question, or null. */
export function parseAnswers(body: unknown): number[] | null {
  const raw = (body as { answers?: unknown } | null)?.answers;
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  if (!raw.every((a) => a === 0 || a === 1 || a === 2)) return null;
  return raw as number[];
}

export function mark(lesson: Lesson, answers: number[]) {
  const results = lesson.quiz.map((item, i) => ({ correct: answers[i] === item.answer, answer: item.answer, why: item.why }));
  const score = results.filter((r) => r.correct).length;
  return { results, score, passed: score >= PASS_MARK };
}

/** True when every lesson in the track is passed, counting the one just passed. */
export function trackComplete(track: TrackKey, passedIds: ReadonlySet<string>): boolean {
  return LESSONS.filter((l) => l.track === track).every((l) => passedIds.has(l.id));
}

// ── Personal plans ───────────────────────────────────────────────────────────

export type PlanRequest = { focus: string; role: PlayerRole; sessions: number; minutes: number };
export type PlanDay = { day: number; title: string; minutes: number; activity: string; lessonId: string | null; lessonTitle: string | null };
export type Plan = { summary: string; days: PlanDay[] };

export function parsePlanRequest(body: unknown): PlanRequest | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const focus = typeof b.focus === 'string' ? b.focus.trim().replace(/\s+/g, ' ') : '';
  if (focus.length < 3) return 'Tell us what you want to get better at.';
  if (focus.length > 200) return 'Keep it under 200 characters.';
  if (!ROLES.includes(b.role as PlayerRole)) return 'Choose what kind of player you are.';
  const sessions = Number(b.sessions);
  if (!Number.isInteger(sessions) || sessions < 2 || sessions > 5) return 'Choose between 2 and 5 sessions a week.';
  const minutes = Number(b.minutes);
  if (![15, 30, 45].includes(minutes)) return 'Choose 15, 30 or 45 minutes a session.';
  return { focus, role: b.role as PlayerRole, sessions, minutes };
}

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/**
 * Checks a plan that came back from the AI and tidies it. Returns null unless it has the right
 * number of days, each with a title and an activity. Lesson ids that do not exist are dropped.
 */
export function cleanPlan(raw: unknown, request: PlanRequest): Plan | null {
  const r = raw as { summary?: unknown; days?: unknown } | null;
  if (!r || !Array.isArray(r.days) || r.days.length !== request.sessions) return null;
  const days: PlanDay[] = [];
  for (let i = 0; i < r.days.length; i++) {
    const d = r.days[i] as Record<string, unknown> | null;
    const title = clip(d?.title, 60);
    const activity = clip(d?.activity, 500);
    if (!title || activity.length < 20) return null;
    const lesson = typeof d?.lessonId === 'string' ? getLesson(d.lessonId) : undefined;
    days.push({ day: i + 1, title, minutes: request.minutes, activity, lessonId: lesson?.id ?? null, lessonTitle: lesson?.title ?? null });
  }
  const summary = clip(r.summary, 300);
  return summary ? { summary, days } : null;
}

const ROLE_LESSONS: Record<PlayerRole, string[]> = {
  batter: ['skills-grip-stance', 'skills-front-foot-drive', 'game-running', 'game-building-an-innings', 'body-calm-under-pressure'],
  bowler: ['skills-bowling-action', 'body-bowling-workload', 'game-field-settings', 'game-lbw', 'body-warm-up'],
  'all-rounder': ['skills-front-foot-drive', 'skills-bowling-action', 'skills-ground-fielding', 'game-building-an-innings', 'body-rest-recovery'],
  keeper: ['skills-catching', 'skills-ground-fielding', 'game-ways-out', 'body-warm-up', 'body-calm-under-pressure'],
  new: ['skills-grip-stance', 'skills-catching', 'skills-bowling-action', 'game-ways-out', 'game-running'],
};
const FOCUS_WORDS: Array<[RegExp, string]> = [
  [/driv|front foot|batt|shot|runs/i, 'skills-front-foot-drive'],
  [/grip|stance|set.?up|backlift/i, 'skills-grip-stance'],
  [/bowl|pace|seam|line|length|accura|yorker|wide/i, 'skills-bowling-action'],
  [/catch|drop/i, 'skills-catching'],
  [/field|throw/i, 'skills-ground-fielding'],
  [/run out|running|single|call/i, 'game-running'],
  [/captain|field setting|set a field|tactic/i, 'game-field-settings'],
  [/lbw|law|rule|umpir/i, 'game-lbw'],
  [/chas|innings|pressure|nerv|confiden|calm/i, 'body-calm-under-pressure'],
  [/fit|strong|injur|back|sore/i, 'body-bowling-workload'],
  [/warm/i, 'body-warm-up'],
  [/eat|food|drink|diet|energy/i, 'body-match-day-fuel'],
  [/sleep|tired|recover/i, 'body-rest-recovery'],
];

/** A plan built from the lesson library alone, used when the AI is unavailable or returns something unusable. */
export function libraryPlan(request: PlanRequest, passedIds: ReadonlySet<string>): Plan {
  const wanted = [
    ...FOCUS_WORDS.filter(([pattern]) => pattern.test(request.focus)).map(([, id]) => id),
    ...ROLE_LESSONS[request.role],
    ...LESSONS.map((l) => l.id),
  ];
  const unique = [...new Set(wanted)];
  // Lessons not yet passed come first; a plan can still revisit passed ones if that is all there is
  const ordered = [...unique.filter((id) => !passedIds.has(id)), ...unique.filter((id) => passedIds.has(id))];
  const days = ordered.slice(0, request.sessions).map((id, i) => {
    const lesson = getLesson(id)!;
    return {
      day: i + 1,
      title: lesson.title,
      minutes: request.minutes,
      activity: `Read the lesson (${lesson.minutes} minutes), then: ${lesson.tryIt}`,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    };
  });
  return {
    summary: `A ${request.sessions}-session week built from Academy lessons that fit what you asked for. Do one a day, in any order, with a rest day in between where you can.`,
    days,
  };
}

// ── Badges and certificates ──────────────────────────────────────────────────

export const GRADUATE = 'graduate' as const;
export type CertificateKey = TrackKey | typeof GRADUATE;

export const badgeSlugFor = (key: CertificateKey): string => `academy-${key}`;

export const isCertificateKey = (v: string): v is CertificateKey => v === GRADUATE || TRACKS.some((t) => t.key === v);

/** True when every track is finished. */
export function allTracksComplete(passedIds: ReadonlySet<string>): boolean {
  return TRACKS.every((t) => trackComplete(t.key, passedIds));
}

/** Which badges a first pass of `lessonId` earns: the track badge if it finished the track, plus graduate if that finished them all. */
export function badgesEarned(lessonTrack: TrackKey, passedBefore: ReadonlySet<string>, lessonId: string): string[] {
  const after = new Set([...passedBefore, lessonId]);
  const out: string[] = [];
  if (trackComplete(lessonTrack, after) && !trackComplete(lessonTrack, passedBefore)) out.push(badgeSlugFor(lessonTrack));
  if (allTracksComplete(after) && !allTracksComplete(passedBefore)) out.push(badgeSlugFor(GRADUATE));
  return out;
}
