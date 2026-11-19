// Pure. The tasks a club can choose to reward with a scratch card, and the sums around them.
// The database does the counting (record_card_task); this file only describes and validates.

export const CARD_TASKS = [
  { key: 'volunteer_shift', label: 'Volunteer shifts', help: 'Counts when a member is checked in to a shift.' },
  { key: 'academy_lesson', label: 'Academy lessons', help: 'Counts the first time a member passes a lesson.' },
  { key: 'video_analysis', label: 'Video analysis', help: 'Counts once a day, however many clips are analysed.' },
  { key: 'game', label: 'Games', help: 'Counts a perfect round of a knowledge game, or winning the Season Manager league.' },
] as const;

export type CardTaskKey = (typeof CARD_TASKS)[number]['key'];
export type CardTaskSetting = { task: CardTaskKey; every_n: number; is_active: boolean };

export const DEFAULT_EVERY: Record<CardTaskKey, number> = { volunteer_shift: 1, academy_lesson: 5, video_analysis: 5, game: 3 };
export const MAX_EVERY = 100;
export const MAX_WEEKLY_CAP = 20;
export const DEFAULT_WEEKLY_CAP = 2;

const KEYS = new Set<string>(CARD_TASKS.map((t) => t.key));
const whole = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);

/** Checks what a club admin sent. Returns the clean settings, or a message saying what is wrong. */
export function parseTaskSettings(input: unknown, weeklyCap: unknown): { tasks: CardTaskSetting[]; weeklyCap: number } | { error: string } {
  if (!Array.isArray(input)) return { error: 'Tasks are missing.' };
  const cap = whole(weeklyCap);
  if (!(cap >= 0 && cap <= MAX_WEEKLY_CAP)) return { error: `The weekly limit must be between 0 and ${MAX_WEEKLY_CAP}.` };

  const seen = new Set<string>();
  const tasks: CardTaskSetting[] = [];
  for (const raw of input) {
    const row = (raw ?? {}) as Record<string, unknown>;
    const task = String(row.task ?? '');
    if (!KEYS.has(task) || seen.has(task)) return { error: 'Unknown task.' };
    seen.add(task);
    const every = whole(row.every_n);
    if (!(every >= 1 && every <= MAX_EVERY)) return { error: `"Every" must be between 1 and ${MAX_EVERY}.` };
    tasks.push({ task: task as CardTaskKey, every_n: every, is_active: row.is_active === true });
  }
  return { tasks, weeklyCap: cap };
}

/** How many more completions until the next card: 1 to every. */
export function untilNextCard(done: number, every: number): number {
  if (!(every >= 1)) return 0;
  return every - (Math.max(0, done) % every);
}

/** One line telling a member how a task earns a card. */
export function taskLine(key: CardTaskKey, every: number, done: number): string {
  const one = { volunteer_shift: 'volunteer shift you turn up for', academy_lesson: 'Academy lesson you pass', video_analysis: 'day you analyse a video', game: 'perfect round or league title in the games' }[key];
  const many = { volunteer_shift: 'volunteer shifts you turn up for', academy_lesson: 'Academy lessons you pass', video_analysis: 'days you analyse a video', game: 'perfect rounds or league titles in the games' }[key];
  if (every === 1) return `Every ${one} is a card.`;
  return `Every ${every} ${many} is a card. ${untilNextCard(done, every)} to go.`;
}
