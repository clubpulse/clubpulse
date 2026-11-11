import { SCORES_PER_GBP, cashoutPence, scoresToPence } from '@/lib/types/scores';
import { CHECKIN_LADDER } from '@/lib/types/scores-engine';
import { SPIN_SEGMENTS } from '@/lib/types/games';
import { QUIZ_BANK, dailyQuestionIndexes } from '@/lib/scores/quiz-bank';

// context.ts imports the service-role client, which needs env vars; only its pure helpers are used here.
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));
import { monthStartIso, ukToday, weekStartIso } from '@/lib/scores/context';

describe('Scores rate', () => {
  it('is 500 Scores to the pound', () => {
    expect(SCORES_PER_GBP).toBe(500);
    expect(scoresToPence(500)).toBe(100);
    expect(scoresToPence(2500)).toBe(500);
    expect(scoresToPence(4)).toBe(0); // under a penny rounds down
  });

  it('pays clubs 80% of face value on cash-out', () => {
    expect(cashoutPence(500)).toBe(80);
    expect(cashoutPence(5000)).toBe(800);
  });
});

describe('Daily quiz', () => {
  it('every question has three options and a valid answer', () => {
    for (const q of QUIZ_BANK) {
      expect(q.options).toHaveLength(3);
      expect([0, 1, 2]).toContain(q.answer);
      expect(new Set(q.options).size).toBe(3);
    }
  });

  it('picks three different questions, the same for a given day', () => {
    for (let d = 1; d <= 28; d++) {
      const day = `2026-11-${String(d).padStart(2, '0')}`;
      const picked = dailyQuestionIndexes(day);
      expect(new Set(picked).size).toBe(3);
      picked.forEach((i) => expect(i).toBeLessThan(QUIZ_BANK.length));
      expect(dailyQuestionIndexes(day)).toEqual(picked);
    }
  });

  it('does not serve the same three questions every day', () => {
    const sets = new Set(Array.from({ length: 14 }, (_, i) => dailyQuestionIndexes(`2026-11-${String(i + 1).padStart(2, '0')}`).join(',')));
    expect(sets.size).toBeGreaterThan(7);
  });
});

describe('Game and check-in tables', () => {
  it('the wheel has eight segments and never pays more than the top prize', () => {
    expect(SPIN_SEGMENTS).toHaveLength(8);
    expect(Math.max(...SPIN_SEGMENTS)).toBe(1);
    expect(Math.min(...SPIN_SEGMENTS)).toBeGreaterThan(0);
  });

  it('the check-in ladder has seven days', () => {
    expect(CHECKIN_LADDER).toHaveLength(7);
  });
});

describe('Day and week boundaries', () => {
  it('uses the UK calendar day', () => {
    expect(ukToday(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02'); // BST: already tomorrow in the UK
    expect(ukToday(new Date('2026-11-11T23:30:00Z'))).toBe('2026-11-11'); // GMT
  });

  it('starts the week on Monday 00:00 UTC, like date_trunc(week) in the database', () => {
    expect(weekStartIso(new Date('2026-11-11T14:00:00Z'))).toBe('2026-11-09T00:00:00.000Z'); // Wednesday
    expect(weekStartIso(new Date('2026-11-09T00:00:00Z'))).toBe('2026-11-09T00:00:00.000Z'); // Monday
    expect(weekStartIso(new Date('2026-11-15T23:59:59Z'))).toBe('2026-11-09T00:00:00.000Z'); // Sunday
  });

  it('starts the month on the 1st', () => {
    expect(monthStartIso(new Date('2026-11-11T14:00:00Z'))).toBe('2026-11-01T00:00:00.000Z');
  });
});
