/**
 * Ball-by-ball scoring maths. Pure functions, no database.
 *
 * The scorer records deliveries; everything else (innings totals, batter and bowler figures)
 * is worked out from the full list of deliveries, so undoing the last ball is exact.
 *
 * Conventions
 *  - extra_runs is the total of extras on the ball. A wide for 1 has extra_runs 1; a wide that
 *    runs four has extra_runs 5. A no-ball has extra_runs 1 (the penalty) and any runs hit are runs_off_bat.
 *  - Byes and leg byes: extra_runs is the runs run. runs_off_bat is 0.
 *  - Wides and no-balls are not legal deliveries: they do not use up a ball of the over.
 *  - A wide is not a ball faced by the batter; a no-ball is.
 *  - The bowler is charged runs off the bat, wides and no-balls, not byes or leg byes.
 *  - A bowler is not credited with a wicket for a run out (or 'other').
 */

export type ExtraType = 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye';
export type DismissalType = 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket' | 'other';
export type InningsSide = 'our' | 'their';

export type Delivery = {
  id?: string;
  seq: number;
  innings: InningsSide;
  over_number: number;
  ball_in_over: number;
  is_legal_delivery: boolean;
  runs_off_bat: number;
  extra_type: ExtraType;
  extra_runs: number;
  wicket: boolean;
  dismissal_type: DismissalType | null;
  dismissed_user_id: string | null;
  fielder_user_id: string | null;
  striker_user_id: string | null;
  non_striker_user_id: string | null;
  bowler_user_id: string | null;
};

export type DeliveryInput = Pick<
  Delivery,
  'innings' | 'runs_off_bat' | 'extra_type' | 'extra_runs' | 'wicket' | 'dismissal_type' | 'dismissed_user_id' | 'fielder_user_id' | 'striker_user_id' | 'non_striker_user_id' | 'bowler_user_id'
>;

export type InningsTotals = { runs: number; wickets: number; overs: string; extras: number; legalBalls: number };

export type BatterFigures = {
  user_id: string; runs: number; balls_faced: number; fours: number; sixes: number;
  how_out: string; batting_position: number;
};
export type BowlerFigures = {
  user_id: string; legal_balls: number; overs_bowled: number; runs_conceded: number; wickets: number; maidens: number;
};
export type FielderFigures = { user_id: string; catches: number; run_outs: number; stumpings: number };

/** 14 legal balls -> "2.2". */
export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

/** "12.3" -> 75 balls. Accepts numbers too (12.3). */
export function oversToBalls(overs: string | number): number {
  const [o, b = '0'] = String(overs).split('.');
  return (parseInt(o, 10) || 0) * 6 + (parseInt(b, 10) || 0);
}

export function isLegal(extra: ExtraType): boolean {
  return extra !== 'wide' && extra !== 'no_ball';
}

export function deliveryRuns(d: Pick<Delivery, 'runs_off_bat' | 'extra_runs'>): number {
  return d.runs_off_bat + d.extra_runs;
}

/** Where the next ball sits, given the legal balls already bowled in this innings. */
export function nextBallPosition(legalBallsBefore: number, legal: boolean): { over_number: number; ball_in_over: number } {
  const after = legalBallsBefore + (legal ? 1 : 0);
  if (legal) return { over_number: Math.floor((after - 1) / 6), ball_in_over: ((after - 1) % 6) + 1 };
  return { over_number: Math.floor(legalBallsBefore / 6), ball_in_over: legalBallsBefore % 6 };
}

/** Runs the batters physically ran on this ball (decides whether they cross). */
export function runsRun(d: Pick<Delivery, 'runs_off_bat' | 'extra_type' | 'extra_runs'>): number {
  if (d.extra_type === 'bye' || d.extra_type === 'leg_bye') return d.extra_runs;
  if (d.extra_type === 'wide') return Math.max(0, d.extra_runs - 1);
  return d.runs_off_bat; // none and no_ball: runs off the bat (a boundary is not run, see isBoundary)
}

/** True when the ball went to the boundary (no running), so the batters do not cross on it. */
export function isBoundary(d: Pick<Delivery, 'runs_off_bat'>): boolean {
  return d.runs_off_bat === 4 || d.runs_off_bat === 6;
}

/**
 * Do the batters end up at opposite ends after this ball?
 * Odd runs run swap the strike; the end of an over swaps it again.
 */
export function strikeSwaps(d: Pick<Delivery, 'runs_off_bat' | 'extra_type' | 'extra_runs' | 'is_legal_delivery' | 'ball_in_over'>): boolean {
  const ran = isBoundary(d) && d.extra_type === 'none' ? 0 : runsRun(d);
  const odd = ran % 2 === 1;
  const overEnds = d.is_legal_delivery && d.ball_in_over === 6;
  return odd !== overEnds; // XOR
}

export type MatchSummary = {
  innings: Record<InningsSide, InningsTotals>;
  batters: Record<string, BatterFigures>; // our batters, keyed by user id
  bowlers: Record<string, BowlerFigures>; // our bowlers
  fielders: Record<string, FielderFigures>;
};

/** Work out every total and figure from the deliveries. Order by seq first. */
export function summarise(deliveries: Delivery[]): MatchSummary {
  const sorted = deliveries.slice().sort((a, b) => a.seq - b.seq);
  const innings: Record<InningsSide, InningsTotals> = {
    our: { runs: 0, wickets: 0, overs: '0.0', extras: 0, legalBalls: 0 },
    their: { runs: 0, wickets: 0, overs: '0.0', extras: 0, legalBalls: 0 },
  };
  const batters: Record<string, BatterFigures> = {};
  const bowlers: Record<string, BowlerFigures> = {};
  const fielders: Record<string, FielderFigures> = {};
  let nextPosition = 1;
  // Runs conceded by bowler in each over, to spot maidens: key "innings|over|bowler"
  const overRuns = new Map<string, { legal: number; runs: number; bowler: string }>();

  const batter = (id: string): BatterFigures =>
    (batters[id] ??= { user_id: id, runs: 0, balls_faced: 0, fours: 0, sixes: 0, how_out: 'not out', batting_position: nextPosition++ });
  const bowler = (id: string): BowlerFigures =>
    (bowlers[id] ??= { user_id: id, legal_balls: 0, overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0 });
  const fielder = (id: string): FielderFigures => (fielders[id] ??= { user_id: id, catches: 0, run_outs: 0, stumpings: 0 });

  for (const d of sorted) {
    const inn = innings[d.innings];
    inn.runs += deliveryRuns(d);
    inn.extras += d.extra_runs;
    if (d.is_legal_delivery) inn.legalBalls += 1;
    if (d.wicket) inn.wickets += 1;

    if (d.innings === 'our') {
      // Our batters: only the people actually at the crease are registered, in the order they appear.
      if (d.striker_user_id) batter(d.striker_user_id);
      if (d.non_striker_user_id) batter(d.non_striker_user_id);
      if (d.striker_user_id) {
        const b = batter(d.striker_user_id);
        b.runs += d.runs_off_bat;
        if (d.extra_type !== 'wide') b.balls_faced += 1;
        if (d.runs_off_bat === 4) b.fours += 1;
        if (d.runs_off_bat === 6) b.sixes += 1;
      }
      if (d.wicket && d.dismissed_user_id) {
        batter(d.dismissed_user_id).how_out = (d.dismissal_type ?? 'out').replace('_', ' ');
      }
    } else if (d.bowler_user_id) {
      // Their innings: our bowler's figures.
      const bw = bowler(d.bowler_user_id);
      if (d.is_legal_delivery) bw.legal_balls += 1;
      const charged = d.runs_off_bat + (d.extra_type === 'wide' || d.extra_type === 'no_ball' ? d.extra_runs : 0);
      bw.runs_conceded += charged;
      if (d.wicket && d.dismissal_type !== 'run_out' && d.dismissal_type !== 'other') bw.wickets += 1;
      const key = `${d.innings}|${d.over_number}|${d.bowler_user_id}`;
      const o = overRuns.get(key) ?? { legal: 0, runs: 0, bowler: d.bowler_user_id };
      if (d.is_legal_delivery) o.legal += 1;
      o.runs += charged;
      overRuns.set(key, o);
    }

    if (d.wicket && d.fielder_user_id) {
      const f = fielder(d.fielder_user_id);
      if (d.dismissal_type === 'caught') f.catches += 1;
      else if (d.dismissal_type === 'run_out') f.run_outs += 1;
      else if (d.dismissal_type === 'stumped') f.stumpings += 1;
    }
  }

  for (const o of overRuns.values()) if (o.legal === 6 && o.runs === 0) bowler(o.bowler).maidens += 1;
  for (const bw of Object.values(bowlers)) bw.overs_bowled = parseFloat(formatOvers(bw.legal_balls));
  for (const side of ['our', 'their'] as const) innings[side].overs = formatOvers(innings[side].legalBalls);

  return { innings, batters, bowlers, fielders };
}

/** Auto commentary for a ball, or null when nothing is worth a line. */
export function commentaryFor(
  d: Pick<Delivery, 'runs_off_bat' | 'extra_type' | 'extra_runs' | 'wicket' | 'dismissal_type'>,
  names: { batter?: string; dismissed?: string; bowler?: string },
  score: { runs: number; wickets: number; overs: string },
): { message: string; event_type: 'wicket' | 'boundary' | 'six' } | null {
  const tag = `${score.runs}/${score.wickets} after ${score.overs}`;
  if (d.wicket) {
    const how = (d.dismissal_type ?? 'out').replace('_', ' ');
    const who = names.dismissed ?? names.batter ?? 'The batter';
    return { message: `🎯 WICKET! ${who} ${how}${names.bowler ? `, b ${names.bowler}` : ''}. ${tag}`, event_type: 'wicket' };
  }
  if (d.runs_off_bat === 6) return { message: `6️⃣ SIX${names.batter ? ` from ${names.batter}` : ''}! ${tag}`, event_type: 'six' };
  if (d.runs_off_bat === 4) return { message: `4️⃣ FOUR${names.batter ? ` from ${names.batter}` : ''}! ${tag}`, event_type: 'boundary' };
  return null;
}
