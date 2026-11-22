// The thought for the day. One line a day, the same for everyone, about the mind side of
// cricket: mindset, getting ready, staying present. Written for ShiftUp, so none of these are
// borrowed from a player or a book and none needs a name under it.

export const THOUGHTS: string[] = [
  'The next ball is the only one you can play.',
  'Nerves mean it matters. Breathe out slowly and take guard.',
  'A dropped catch is one ball. Want the next one to come to you.',
  'Routines are how you tell your body it is time.',
  'Play the ball, not the bowler\'s reputation.',
  'You do not have to feel ready. You have to start.',
  'Quiet feet, quiet head. Watch the ball out of the hand.',
  'Good days are built in the nets nobody watches.',
  'A bad over ends. Walk back to your mark and bowl the next one.',
  'Decide your plan before the bowler runs in, then trust it.',
  'Confidence is remembering what you have already done.',
  'The scoreboard is information, not a verdict on you.',
  'One good habit, repeated, beats ten good intentions.',
  'Be the teammate who is still talking when the game is going away.',
  'Slow your breathing and the game slows with it.',
  'You cannot control the pitch, the toss or the umpire. You can control your next decision.',
  'Leave well. Not every ball needs you.',
  'Pressure is a sign you are in the game. Enjoy being in the game.',
  'Mistakes are how you find the edge of what you can do.',
  'Arrive early, switch on slowly, stay switched on.',
  'Between balls, look up at something far away. Then come back.',
  'Bowl your best ball more often. That is the whole job.',
  'Talk to yourself the way you would talk to your best mate at the other end.',
  'A long innings is a lot of short ones.',
  'Today\'s work is quiet. The runs it buys are loud.',
  'When the plan stops working, change the plan, not your belief.',
  'Want the ball when the game is tight.',
  'Rest is part of training, not time off from it.',
  'Clap the good ball. Then get ready for the next.',
  'You are allowed to be nervous and brilliant in the same over.',
  'Small targets: this over, this ball, this breath.',
  'The field looks crowded when you are tense. Loosen your grip and the gaps appear.',
  'Carry your bat lightly and your standards heavily.',
  'Nobody remembers the perfect warm-up. Everybody benefits from a consistent one.',
  'Finish the day with one thing you did well. Write it down.',
  'A team is eleven people making each other braver.',
  'Reset is a skill. Practise it like a cover drive.',
  'Your best is different every day. Give today\'s.',
  'Watch the ball. Everything else is commentary.',
  'When you are out, you are out. Be the loudest supporter on the boundary.',
  'Prepare so well that the match feels like the easy part.',
  'Patience is an attacking shot played slowly.',
  'Ask one question at training today. Curiosity scores runs later.',
  'Field as if the ball is coming to you, every ball.',
  'Start again. Batters do it every single delivery.',
];

/** Days since a fixed date, counted on this device's own calendar, so the line changes at midnight. */
function dayNumber(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

/** Today's thought. Everyone gets the same one on the same date. */
export function thoughtFor(now: Date = new Date()): string {
  return THOUGHTS[((dayNumber(now) % THOUGHTS.length) + THOUGHTS.length) % THOUGHTS.length];
}
