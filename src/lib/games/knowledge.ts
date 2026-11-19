// Pure. The three daily knowledge games: Umpire's Call, Who Am I? and Scorecard Detective.
// Everyone gets the same round on the same day, so club mates can compare. The server keeps the
// answers: a round sent to the phone has them stripped out, and marking happens on the server.

import { UMPIRE_BANK } from './bank-umpire';
import { WHOAMI_BANK } from './bank-whoami';

export const KNOWLEDGE_GAMES = ['umpire', 'whoami', 'scorecard'] as const;
export type KnowledgeGame = (typeof KNOWLEDGE_GAMES)[number];
export const isKnowledgeGame = (v: unknown): v is KnowledgeGame => (KNOWLEDGE_GAMES as readonly unknown[]).includes(v);

export const GAME_INFO: Record<KnowledgeGame, { title: string; rule: string; questions: number; maxScore: number; blurb: string }> = {
  umpire: { title: "Umpire's Call", rule: 'game_umpire', questions: 5, maxScore: 5, blurb: 'Five decisions. What would you give?' },
  whoami: { title: 'Who Am I?', rule: 'game_whoami', questions: 3, maxScore: 12, blurb: 'Three cricketers. The fewer clues you need, the more you score.' },
  scorecard: { title: 'Scorecard Detective', rule: 'game_scorecard', questions: 5, maxScore: 5, blurb: 'Five scorecards with a number missing.' },
};

/** A question as the phone sees it: no answer. Who Am I? sends its clues to be shown one at a time. */
export type PublicQuestion = { prompt: string; options: string[]; clues?: string[] };
type Question = PublicQuestion & { answer: number; why: string };
export type Answer = { choice: number; clues?: number };
export type Marked = { score: number; maxScore: number; perfect: boolean; review: Array<{ correct: boolean; answer: string; why: string; points: number }> };

// ── Seeded randomness ────────────────────────────────────────────────────────

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

function shuffle<T>(items: readonly T[], r: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Days since a fixed start, so a bank is walked through in order without repeats until it runs out. */
function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

/** `count` items for the day: the bank in a fixed shuffled order, taken in consecutive blocks. */
function pickForDay<T>(bank: readonly T[], date: string, count: number, salt: string): T[] {
  const perCycle = Math.floor(bank.length / count);
  const day = dayNumber(date);
  const cycle = Math.floor(day / perCycle);
  const order = shuffle(bank, rng(hash(`${salt}:${cycle}`)));
  const start = (day % perCycle) * count;
  return order.slice(start, start + count);
}

// ── The three games ──────────────────────────────────────────────────────────

function umpireRound(date: string): Question[] {
  return pickForDay(UMPIRE_BANK, date, GAME_INFO.umpire.questions, 'umpire').map((q) => ({
    prompt: q.q, options: [...q.options], answer: q.answer, why: q.why,
  }));
}

function whoamiRound(date: string): Question[] {
  const r = rng(hash(`whoami-options:${date}`));
  return pickForDay(WHOAMI_BANK, date, GAME_INFO.whoami.questions, 'whoami').map((m) => {
    const others = shuffle(WHOAMI_BANK.filter((o) => o.name !== m.name), r).slice(0, 3).map((o) => o.name);
    const options = shuffle([m.name, ...others], r);
    return { prompt: 'Who am I?', clues: [...m.clues], options, answer: options.indexOf(m.name), why: m.clues[3] };
  });
}

/** Four distinct choices with the right one among them. Wrong ones are near misses, never negative. */
function choices(right: number, r: () => number, format: (n: number) => string, step = 1): { options: string[]; answer: number } {
  const set = new Set<number>([right]);
  const offsets = shuffle([-3, -2, -1, 1, 2, 3, 4, 5, 10, -10], r);
  for (const o of offsets) {
    if (set.size === 4) break;
    const v = Math.round((right + o * step) * 100) / 100;
    if (v >= 0) set.add(v);
  }
  let pad = 6;
  while (set.size < 4) set.add(Math.round((right + pad++ * step) * 100) / 100);
  const ordered = shuffle([...set], r);
  return { options: ordered.map(format), answer: ordered.indexOf(right) };
}

const whole = (n: number) => String(n);
const twoDp = (n: number) => n.toFixed(2);

const PUZZLES: Array<(r: () => number) => Question> = [
  // A missing batter's score
  (r) => {
    const scores = Array.from({ length: 5 }, () => int(r, 0, 78));
    const extras = int(r, 4, 19);
    const total = scores.reduce((a, s) => a + s, 0) + extras;
    const hidden = int(r, 0, 4);
    const shown = scores.map((s, i) => (i === hidden ? '?' : String(s))).join(', ');
    return {
      prompt: `In a five-a-side game a side finishes on ${total}. The five batters made ${shown} and there were ${extras} extras. What did the missing batter score?`,
      ...choices(scores[hidden], r, whole), why: `${total} minus the other four scores and ${extras} extras leaves ${scores[hidden]}.`,
    };
  },
  // Economy rate
  (r) => {
    const overs = int(r, 4, 10);
    const runs = overs * int(r, 3, 8) + int(r, 0, overs - 1);
    const econ = Math.round((runs / overs) * 100) / 100;
    return {
      prompt: `A bowler's figures are ${overs} overs, ${runs} runs. What is the economy rate?`,
      ...choices(econ, r, twoDp, 0.25), why: `${runs} runs divided by ${overs} overs is ${econ.toFixed(2)} an over.`,
    };
  },
  // Strike rate
  (r) => {
    const balls = int(r, 2, 12) * 5;
    const runs = Math.round((balls * int(r, 60, 180)) / 100);
    const sr = Math.round((runs / balls) * 10000) / 100;
    return {
      prompt: `A batter makes ${runs} from ${balls} balls. What is the strike rate?`,
      ...choices(sr, r, twoDp, 5), why: `${runs} divided by ${balls}, times 100, is ${sr.toFixed(2)}.`,
    };
  },
  // Runs still needed
  (r) => {
    const target = int(r, 120, 260);
    const score = int(r, 40, target - 12);
    return {
      prompt: `Chasing ${target} to win, a side is ${score} for ${int(r, 1, 7)}. How many more runs do they need?`,
      ...choices(target - score, r, whole), why: `${target} minus ${score} is ${target - score}.`,
    };
  },
  // Required rate
  (r) => {
    const overs = int(r, 2, 10);
    const need = overs * int(r, 4, 11) + int(r, 0, overs - 1);
    const rate = Math.round((need / overs) * 100) / 100;
    return {
      prompt: `A side needs ${need} runs from the last ${overs} overs. What run rate do they need?`,
      ...choices(rate, r, twoDp, 0.5), why: `${need} divided by ${overs} is ${rate.toFixed(2)} an over.`,
    };
  },
  // Balls left
  (r) => {
    const total = [20, 40, 45, 50][int(r, 0, 3)];
    const done = int(r, 3, total - 2);
    const balls = int(r, 1, 5);
    const left = (total - done) * 6 - balls;
    return {
      prompt: `In a ${total}-over innings, ${done}.${balls} overs have been bowled. How many balls are left?`,
      ...choices(left, r, whole), why: `${total - done} overs is ${(total - done) * 6} balls, less the ${balls} already bowled in this over, is ${left}.`,
    };
  },
  // Partnership
  (r) => {
    const fall = int(r, 20, 140);
    const next = fall + int(r, 5, 120);
    const wicket = int(r, 1, 8);
    return {
      prompt: `Wicket ${wicket} fell at ${fall}. Wicket ${wicket + 1} fell at ${next}. How many runs was that partnership worth?`,
      ...choices(next - fall, r, whole), why: `${next} minus ${fall} is ${next - fall}.`,
    };
  },
  // Batting average
  (r) => {
    const outs = int(r, 4, 12);
    const avg = int(r, 12, 55);
    const runs = outs * avg;
    const innings = outs + int(r, 1, 3);
    return {
      prompt: `A batter has ${runs} runs from ${innings} innings and was not out ${innings - outs} times. What is the batting average?`,
      ...choices(avg, r, twoDp, 2), why: `Average is runs divided by dismissals: ${runs} divided by ${outs} is ${avg.toFixed(2)}.`,
    };
  },
];

function scorecardRound(date: string): Question[] {
  const r = rng(hash(`scorecard:${date}`));
  return shuffle(PUZZLES, r).slice(0, GAME_INFO.scorecard.questions).map((make) => make(r));
}

function fullRound(game: KnowledgeGame, date: string): Question[] {
  return game === 'umpire' ? umpireRound(date) : game === 'whoami' ? whoamiRound(date) : scorecardRound(date);
}

/** Today's round with the answers taken out, safe to send to the phone. */
export function publicRound(game: KnowledgeGame, date: string): PublicQuestion[] {
  return fullRound(game, date).map(({ prompt, options, clues }) => ({ prompt, options, ...(clues ? { clues } : {}) }));
}

/** Checks the shape of what the phone sent. Null if it is not a full set of answers for this game. */
export function parseAnswers(game: KnowledgeGame, raw: unknown): Answer[] | null {
  if (!Array.isArray(raw) || raw.length !== GAME_INFO[game].questions) return null;
  const out: Answer[] = [];
  for (const item of raw) {
    const a = (item ?? {}) as { choice?: unknown; clues?: unknown };
    if (!(typeof a.choice === 'number' && Number.isInteger(a.choice) && a.choice >= -1 && a.choice <= 3)) return null;
    if (game === 'whoami') {
      if (!(typeof a.clues === 'number' && Number.isInteger(a.clues) && a.clues >= 1 && a.clues <= 4)) return null;
      out.push({ choice: a.choice, clues: a.clues });
    } else {
      out.push({ choice: a.choice });
    }
  }
  return out;
}

/**
 * Marks a round. One point per right answer, except Who Am I?, where a right answer is worth
 * 4, 3, 2 or 1 depending on how many clues were shown. A choice of -1 means no answer.
 */
export function markRound(game: KnowledgeGame, date: string, answers: Answer[]): Marked {
  const round = fullRound(game, date);
  const review = round.map((q, i) => {
    const a = answers[i];
    const correct = !!a && a.choice === q.answer;
    const points = !correct ? 0 : game === 'whoami' ? 5 - (a.clues ?? 4) : 1;
    return { correct, answer: q.options[q.answer], why: q.why, points };
  });
  const score = review.reduce((sum, r) => sum + r.points, 0);
  return { score, maxScore: GAME_INFO[game].maxScore, perfect: review.every((r) => r.correct), review };
}
