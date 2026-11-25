import { decryptApiKey, encryptApiKey } from '@/lib/playcricket/crypto';
import { matchListUrl, parseMatches, parseResults, parseScorecard, resultSummaryUrl, scorecardUrl } from '@/lib/playcricket/client';
import { playCricketSyncEnabled } from '@/lib/playcricket/flag';
import { linkedAccountIsPrivate, visibleLinks } from '@/lib/playcricket/privacy';
import { entryWindow, syncPlayCricket } from '@/lib/playcricket/sync';

const SECRET = 'test-secret-at-least-16';

describe('Play-Cricket flag', () => {
  it('stays off unless the flag is exactly true', () => {
    expect(playCricketSyncEnabled({})).toBe(false);
    expect(playCricketSyncEnabled({ NEXT_PUBLIC_PLAYCRICKET_SYNC_ENABLED: 'TRUE' })).toBe(false);
    expect(playCricketSyncEnabled({ NEXT_PUBLIC_PLAYCRICKET_SYNC_ENABLED: 'true' })).toBe(true);
  });

  it('does not call Play-Cricket when the flag is off', async () => {
    const seen: string[] = [];
    const result = await syncPlayCricket({ from: () => { throw new Error('should not read'); } } as never, async (url) => {
      seen.push(url);
      return { status: 200, body: {} };
    }, new Date(), {});
    expect(result).toEqual({ clubs: 0, skipped: true });
    expect(seen).toEqual([]);
  });
});

describe('Play-Cricket key encryption', () => {
  it('round-trips a key and rejects a different secret', () => {
    const stored = encryptApiKey('club-key-1001', SECRET);
    expect(stored.ciphertext).not.toContain('club-key-1001');
    expect(decryptApiKey(stored.ciphertext, stored.iv, SECRET)).toBe('club-key-1001');
    expect(() => decryptApiKey(stored.ciphertext, stored.iv, 'another-secret-value')).toThrow();
  });
});

describe('Play-Cricket client', () => {
  it('asks only for one site, one season and a short date window', () => {
    const url = new URL(matchListUrl('1001', 'club-key', '2026', '01/04/2026', '02/04/2026'));
    expect(url.pathname).toBe('/api/v2/matches.json');
    expect(url.searchParams.get('site_id')).toBe('1001');
    expect(url.searchParams.get('season')).toBe('2026');
    expect(url.searchParams.get('from_entry_date')).toBe('01/04/2026');
    expect(url.searchParams.get('end_entry_date')).toBe('02/04/2026');
    expect([...url.searchParams.keys()].sort()).toEqual(['api_token', 'end_entry_date', 'from_entry_date', 'season', 'site_id']);
    expect(new URL(resultSummaryUrl('1001', 'club-key', '2026', '01/04/2026', '02/04/2026')).pathname).toBe('/api/v2/result_summary.json');
    expect(new URL(scorecardUrl('club-key', '55')).pathname).toBe('/api/v2/match_detail.json');
  });

  it('keeps fixture, result and scorecard names, and drops officials and contact fields', () => {
    const matches = parseMatches({
      matches: [{
        id: 55, status: 'New', season: '2026', match_date: '01/06/2026', match_time: '13:00',
        home_team_name: 'Home XI', away_team_name: 'Away XI', home_team_id: '1', away_team_id: '2',
        competition_type: 'League', ground_name: 'Example Ground', last_updated: '01/06/2026',
        umpire_1_name: 'Should Not Be Stored', scorer_1_name: 'Also Not Stored',
      }, { id: 56, status: 'Deleted' }],
    });
    expect(matches).toEqual([{
      playMatchId: '55', season: '2026', matchDate: '01/06/2026', matchTime: '13:00',
      homeTeamName: 'Home XI', awayTeamName: 'Away XI', homeTeamId: '1', awayTeamId: '2',
      competitionType: 'League', status: 'New', groundName: 'Example Ground', lastUpdated: '01/06/2026',
    }]);
    expect(JSON.stringify(matches)).not.toContain('Should Not');
    const results = parseResults({ matches: [{ id: 55, result_description: 'Home XI won', innings: [{ runs: '120', wickets: '8' }, { runs: '90', wickets: '10' }] }] });
    expect(results[0]).toMatchObject({ playMatchId: '55', homeRuns: 120, awayWickets: 10 });
    const players = parseScorecard('55', { innings: [{ team_batting_id: '1', team_batting_name: 'Home XI', batsmen: [{ batsman_name: 'Alex Player', email: 'a@example.com' }], bowlers: [{ bowler_name: 'Sam Bowler' }] }] });
    expect(players).toEqual([
      { playMatchId: '55', teamId: '1', teamName: 'Home XI', playerName: 'Alex Player', role: 'bat' },
      { playMatchId: '55', teamId: '1', teamName: 'Home XI', playerName: 'Sam Bowler', role: 'bowl' },
    ]);
    expect(JSON.stringify(players)).not.toContain('email');
  });

  it('uses a one-day window', () => {
    expect(entryWindow(new Date('2026-06-02T12:00:00Z'))).toEqual({ from: '01/06/2026', to: '02/06/2026', season: '2026' });
  });
});

describe('Play-Cricket account links', () => {
  const row = { playerName: 'Alex Player', teamId: '1', userId: 'user-1', isJunior: false, dateOfBirth: '2014-01-01' };

  it('hides a junior or unverified account from other people and never needs a date of birth in the result', () => {
    expect(linkedAccountIsPrivate({ isJunior: true, dateOfBirth: '1990-01-01' })).toBe(true);
    expect(linkedAccountIsPrivate({ isJunior: false, dateOfBirth: null })).toBe(true);
    expect(linkedAccountIsPrivate({ isJunior: false, dateOfBirth: '1990-01-01' })).toBe(false);
    expect(visibleLinks([row], false)).toEqual([{ playerName: 'Alex Player', teamId: '1', userId: null }]);
    expect(visibleLinks([row], true)[0].userId).toBe('user-1');
    expect(JSON.stringify(visibleLinks([row], true))).not.toMatch(/dateOfBirth|2014/);
  });
});
