import {
  summarise, formatOvers, oversToBalls, nextBallPosition, strikeSwaps, commentaryFor,
  type Delivery, type DeliveryInput,
} from '@/lib/match-day/scoring';

/** Build a ball-by-ball list the way the server action does. */
function play(inputs: Partial<DeliveryInput>[], innings: 'our' | 'their' = 'our'): Delivery[] {
  const out: Delivery[] = [];
  let legal = 0;
  inputs.forEach((i, idx) => {
    const extra = i.extra_type ?? 'none';
    const isLegalBall = extra !== 'wide' && extra !== 'no_ball';
    const pos = nextBallPosition(legal, isLegalBall);
    if (isLegalBall) legal += 1;
    out.push({
      seq: idx + 1, innings, ...pos, is_legal_delivery: isLegalBall,
      runs_off_bat: 0, extra_type: extra, extra_runs: 0, wicket: false, dismissal_type: null,
      dismissed_user_id: null, fielder_user_id: null, striker_user_id: 'A', non_striker_user_id: 'B', bowler_user_id: null,
      ...i,
    } as Delivery);
  });
  return out;
}

describe('overs', () => {
  it('formats and parses cricket overs', () => {
    expect(formatOvers(0)).toBe('0.0');
    expect(formatOvers(14)).toBe('2.2');
    expect(formatOvers(36)).toBe('6.0');
    expect(oversToBalls('2.2')).toBe(14);
    expect(oversToBalls(12.3)).toBe(75);
  });

  it('six legal balls make an over; wides and no-balls do not use one up', () => {
    const d = play([{}, { extra_type: 'wide', extra_runs: 1 }, {}, { extra_type: 'no_ball', extra_runs: 1 }, {}, {}, {}, {}]);
    expect(summarise(d).innings.our.overs).toBe('1.0'); // 6 legal balls
    expect(d[1].ball_in_over).toBe(1); // wide after one legal ball
    expect(d[5].over_number).toBe(0);
    expect(d[7].over_number).toBe(0); // sixth legal ball still over 0
    expect(play([{}, {}, {}, {}, {}, {}, {}])[6].over_number).toBe(1);
  });
});

describe('batting innings', () => {
  it('adds runs, extras and wickets to the totals', () => {
    const d = play([
      { runs_off_bat: 4 },
      { extra_type: 'wide', extra_runs: 1 },
      { runs_off_bat: 1, extra_type: 'no_ball', extra_runs: 1 },
      { extra_type: 'bye', extra_runs: 2 },
      { wicket: true, dismissal_type: 'bowled', dismissed_user_id: 'A' },
    ]);
    const s = summarise(d).innings.our;
    expect(s.runs).toBe(4 + 1 + 2 + 2); // 9
    expect(s.extras).toBe(1 + 1 + 2);   // 4
    expect(s.wickets).toBe(1);
    expect(s.overs).toBe('0.3');        // bat 4, bye, wicket ball = 3 legal balls
  });

  it('tracks batter figures: balls faced exclude wides but include no-balls', () => {
    const d = play([
      { runs_off_bat: 6 },
      { extra_type: 'wide', extra_runs: 1 },
      { runs_off_bat: 2, extra_type: 'no_ball', extra_runs: 1 },
      { runs_off_bat: 4 },
      { wicket: true, dismissal_type: 'caught', dismissed_user_id: 'A', fielder_user_id: 'F' },
    ]);
    const m = summarise(d);
    expect(m.batters.A).toMatchObject({ runs: 12, balls_faced: 4, fours: 1, sixes: 1, how_out: 'caught', batting_position: 1 });
    expect(m.batters.B.how_out).toBe('not out');
    expect(m.fielders.F.catches).toBe(1);
  });
});

describe('bowling innings (our bowler)', () => {
  const ball = (o: Partial<DeliveryInput>) => ({ innings: 'their' as const, striker_user_id: null, non_striker_user_id: null, bowler_user_id: 'BOWL', ...o });

  it('charges the bowler for bat runs, wides and no-balls but not byes or leg byes', () => {
    const d = play([
      ball({ runs_off_bat: 3 }),
      ball({ extra_type: 'wide', extra_runs: 1 }),
      ball({ extra_type: 'no_ball', extra_runs: 1, runs_off_bat: 4 }),
      ball({ extra_type: 'bye', extra_runs: 1 }),
      ball({ extra_type: 'leg_bye', extra_runs: 2 }),
    ], 'their');
    const m = summarise(d);
    expect(m.bowlers.BOWL.runs_conceded).toBe(3 + 1 + 5);
    expect(m.innings.their.runs).toBe(3 + 1 + 5 + 1 + 2);
    expect(m.bowlers.BOWL.legal_balls).toBe(3);
  });

  it('credits wickets except run outs, and counts a maiden over', () => {
    const maiden = Array.from({ length: 6 }, () => ball({}));
    maiden[5] = ball({ wicket: true, dismissal_type: 'lbw' });
    const m1 = summarise(play(maiden, 'their'));
    expect(m1.bowlers.BOWL).toMatchObject({ wickets: 1, maidens: 1, overs_bowled: 1, runs_conceded: 0 });

    const ro = summarise(play([ball({ wicket: true, dismissal_type: 'run_out', fielder_user_id: 'F' })], 'their'));
    expect(ro.bowlers.BOWL.wickets).toBe(0);
    expect(ro.innings.their.wickets).toBe(1);
    expect(ro.fielders.F.run_outs).toBe(1);

    const notMaiden = Array.from({ length: 6 }, (_, i) => ball(i === 2 ? { runs_off_bat: 1 } : {}));
    expect(summarise(play(notMaiden, 'their')).bowlers.BOWL.maidens).toBe(0);
  });

  it('keeps our and their innings separate', () => {
    const d = [...play([{ runs_off_bat: 4 }], 'our'), ...play([{ innings: 'their', runs_off_bat: 1, bowler_user_id: 'BOWL', striker_user_id: null, non_striker_user_id: null }], 'their').map((x) => ({ ...x, seq: 2 }))];
    const s = summarise(d);
    expect(s.innings.our.runs).toBe(4);
    expect(s.innings.their.runs).toBe(1);
  });
});

describe('undo is exact', () => {
  it('summarising without the last ball matches the state before it', () => {
    const d = play([{ runs_off_bat: 4 }, { runs_off_bat: 1 }, { wicket: true, dismissal_type: 'bowled', dismissed_user_id: 'A' }]);
    expect(summarise(d.slice(0, 2)).innings.our).toMatchObject({ runs: 5, wickets: 0, overs: '0.2' });
    expect(summarise(d).innings.our).toMatchObject({ runs: 5, wickets: 1, overs: '0.3' });
  });
});

describe('strike rotation', () => {
  const sw = (o: Partial<Delivery>) => strikeSwaps({ runs_off_bat: 0, extra_type: 'none', extra_runs: 0, is_legal_delivery: true, ball_in_over: 1, ...o });
  it('odd runs swap, even do not, boundaries do not', () => {
    expect(sw({ runs_off_bat: 1 })).toBe(true);
    expect(sw({ runs_off_bat: 2 })).toBe(false);
    expect(sw({ runs_off_bat: 3 })).toBe(true);
    expect(sw({ runs_off_bat: 4 })).toBe(false);
    expect(sw({})).toBe(false);
  });
  it('the end of the over swaps again', () => {
    expect(sw({ ball_in_over: 6 })).toBe(true);          // dot ball at end of over
    expect(sw({ ball_in_over: 6, runs_off_bat: 1 })).toBe(false); // single then over ends: back where they started
  });
  it('wide with a run and byes count as runs run', () => {
    expect(sw({ extra_type: 'wide', extra_runs: 2, is_legal_delivery: false })).toBe(true);
    expect(sw({ extra_type: 'wide', extra_runs: 1, is_legal_delivery: false })).toBe(false);
    expect(sw({ extra_type: 'bye', extra_runs: 1 })).toBe(true);
  });
});

describe('commentary', () => {
  const score = { runs: 50, wickets: 2, overs: '8.1' };
  it('writes lines for wickets, fours and sixes only', () => {
    expect(commentaryFor({ runs_off_bat: 4, extra_type: 'none', extra_runs: 0, wicket: false, dismissal_type: null }, { batter: 'A. Patel' }, score)?.event_type).toBe('boundary');
    expect(commentaryFor({ runs_off_bat: 6, extra_type: 'none', extra_runs: 0, wicket: false, dismissal_type: null }, {}, score)?.event_type).toBe('six');
    expect(commentaryFor({ runs_off_bat: 0, extra_type: 'none', extra_runs: 0, wicket: true, dismissal_type: 'bowled' }, { dismissed: 'A. Patel' }, score)?.message).toContain('WICKET');
    expect(commentaryFor({ runs_off_bat: 1, extra_type: 'none', extra_runs: 0, wicket: false, dismissal_type: null }, {}, score)).toBeNull();
  });
});
