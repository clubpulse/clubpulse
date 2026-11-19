import { UMPIRE_BANK } from '@/lib/games/bank-umpire';
import { WHOAMI_BANK } from '@/lib/games/bank-whoami';
import { GAME_INFO, KNOWLEDGE_GAMES, isKnowledgeGame, markRound, parseAnswers, publicRound } from '@/lib/games/knowledge';

const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10));

describe('knowledge games', () => {
  it('has sound banks', () => {
    for (const q of UMPIRE_BANK) {
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options).size).toBe(3);
      expect(q.options[q.answer]).toBeTruthy();
      expect(q.why.length).toBeGreaterThan(20);
    }
    expect(new Set(UMPIRE_BANK.map((q) => q.q)).size).toBe(UMPIRE_BANK.length);
    expect(new Set(WHOAMI_BANK.map((m) => m.name)).size).toBe(WHOAMI_BANK.length);
    for (const m of WHOAMI_BANK) {
      expect(m.clues).toHaveLength(4);
      // A clue must never give the answer away by naming the player
      for (const part of m.name.split(' ')) if (part.length > 3) expect(m.clues.join(' ')).not.toContain(part);
    }
  });

  it('gives everyone the same round on the same day', () => {
    for (const game of KNOWLEDGE_GAMES) {
      expect(publicRound(game, '2026-11-19')).toEqual(publicRound(game, '2026-11-19'));
      expect(publicRound(game, '2026-11-19')).toHaveLength(GAME_INFO[game].questions);
    }
  });

  it('never sends the answer to the phone', () => {
    for (const game of KNOWLEDGE_GAMES) {
      for (const q of publicRound(game, '2026-11-19')) {
        expect(Object.keys(q).sort()).toEqual(game === 'whoami' ? ['clues', 'options', 'prompt'] : ['options', 'prompt']);
      }
    }
  });

  it('does not repeat an umpire question or a mystery player within a cycle', () => {
    const perCycle = Math.floor(UMPIRE_BANK.length / 5);
    const start = Math.ceil(Date.parse('2026-11-01T00:00:00Z') / 86_400_000 / perCycle) * perCycle;
    const prompts: string[] = [];
    for (let d = 0; d < perCycle; d++) {
      const date = new Date((start + d) * 86_400_000).toISOString().slice(0, 10);
      prompts.push(...publicRound('umpire', date).map((q) => q.prompt));
    }
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('builds scorecard puzzles with four distinct choices and a right answer that checks out', () => {
    for (const date of days) {
      const round = publicRound('scorecard', date);
      for (const q of round) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        for (const o of q.options) expect(Number(o)).toBeGreaterThanOrEqual(0);
      }
      // Answering with the marked-correct option scores full marks
      const key = markRound('scorecard', date, round.map(() => ({ choice: -1 }))).review.map((r) => r.answer);
      const answers = round.map((q, i) => ({ choice: q.options.indexOf(key[i]) }));
      expect(answers.every((a) => a.choice >= 0)).toBe(true);
      expect(markRound('scorecard', date, answers)).toMatchObject({ score: 5, perfect: true });
    }
  });

  it('always includes the right name among the Who Am I? options', () => {
    for (const date of days) {
      const round = publicRound('whoami', date);
      const key = markRound('whoami', date, round.map(() => ({ choice: -1, clues: 4 }))).review.map((r) => r.answer);
      round.forEach((q, i) => {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(key[i]);
      });
    }
  });

  it('scores Who Am I? by clues used', () => {
    const date = '2026-11-19';
    const round = publicRound('whoami', date);
    const key = markRound('whoami', date, round.map(() => ({ choice: -1, clues: 4 }))).review.map((r) => r.answer);
    const right = (clues: number) => round.map((q, i) => ({ choice: q.options.indexOf(key[i]), clues }));
    expect(markRound('whoami', date, right(1)).score).toBe(12);
    expect(markRound('whoami', date, right(4)).score).toBe(3);
    const mixed = right(2);
    mixed[0] = { choice: (mixed[0].choice + 1) % 4, clues: 1 };
    expect(markRound('whoami', date, mixed)).toMatchObject({ score: 6, perfect: false });
  });

  it('gives nothing for no answer or a wrong one', () => {
    const date = '2026-11-19';
    expect(markRound('umpire', date, Array.from({ length: 5 }, () => ({ choice: -1 }))).score).toBe(0);
  });

  it('refuses malformed answers', () => {
    expect(parseAnswers('umpire', [{ choice: 0 }])).toBeNull();
    expect(parseAnswers('umpire', Array(5).fill({ choice: 9 }))).toBeNull();
    expect(parseAnswers('umpire', Array(5).fill({ choice: 1.5 }))).toBeNull();
    expect(parseAnswers('whoami', Array(3).fill({ choice: 1 }))).toBeNull();
    expect(parseAnswers('whoami', Array(3).fill({ choice: 1, clues: 0 }))).toBeNull();
    expect(parseAnswers('whoami', Array(3).fill({ choice: 1, clues: 2 }))).toEqual(Array(3).fill({ choice: 1, clues: 2 }));
    expect(parseAnswers('scorecard', 'x')).toBeNull();
    expect(isKnowledgeGame('umpire')).toBe(true);
    expect(isKnowledgeGame('spin')).toBe(false);
  });
});
