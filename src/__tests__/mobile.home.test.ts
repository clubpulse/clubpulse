import { isAvailability, leaguePlace, streakFrom } from '@/lib/mobile/home-logic';

describe('app Home sums', () => {
  const totals = [{ user_id: 'a', total: 300 }, { user_id: 'b', total: 120 }, { user_id: 'me', total: 68 }, { user_id: 'd', total: 10 }];

  it('places a member in the weekly table', () => {
    expect(leaguePlace(totals, 'me')).toEqual({ rank: 3, behind: 52, aheadRank: 2 });
    expect(leaguePlace(totals, 'a')).toEqual({ rank: 1, behind: 0, aheadRank: null });
  });

  it('has no place for someone with nothing earned this week', () => {
    expect(leaguePlace(totals, 'nobody')).toBeNull();
    expect(leaguePlace([{ user_id: 'me', total: 0 }], 'me')).toBeNull();
    expect(leaguePlace([], 'me')).toBeNull();
  });

  it('shows at least 1 behind when level with the person above', () => {
    expect(leaguePlace([{ user_id: 'a', total: 50 }, { user_id: 'me', total: 50 }], 'me')).toEqual({ rank: 2, behind: 1, aheadRank: 1 });
  });

  it('reads the live streak', () => {
    expect(streakFrom([{ checkin_date: '2026-11-19', streak_day: 4 }], '2026-11-19', '2026-11-18')).toEqual({ day: 4, doneToday: true });
    expect(streakFrom([{ checkin_date: '2026-11-18', streak_day: 3 }], '2026-11-19', '2026-11-18')).toEqual({ day: 3, doneToday: false });
    expect(streakFrom([], '2026-11-19', '2026-11-18')).toEqual({ day: 0, doneToday: false });
  });

  it('accepts only real availability replies', () => {
    expect(isAvailability('available')).toBe(true);
    expect(isAvailability('unknown')).toBe(true);
    expect(isAvailability('maybe')).toBe(false);
    expect(isAvailability(1)).toBe(false);
  });
});
