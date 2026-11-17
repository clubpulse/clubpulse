// Server-only question bank for the daily Cricket Quiz. The answer index never leaves the server:
// getDailyQuiz() sends questions and options only, and submitQuiz() grades on the server.

export type QuizQuestion = { q: string; options: [string, string, string]; answer: 0 | 1 | 2 };

export const QUIZ_BANK: QuizQuestion[] = [
  { q: 'How many legal balls are there in a standard over?', options: ['Five', 'Six', 'Eight'], answer: 1 },
  { q: 'How long is a full-size cricket pitch, from stumps to stumps?', options: ['18 yards', '20 yards', '22 yards'], answer: 2 },
  { q: 'What does LBW stand for?', options: ['Leg before wicket', 'Leg behind wicket', 'Low ball wide'], answer: 0 },
  { q: 'How many players does each side have on the field?', options: ['Nine', 'Eleven', 'Thirteen'], answer: 1 },
  { q: 'How many stumps make up one wicket?', options: ['Two', 'Three', 'Four'], answer: 1 },
  { q: 'How many bails sit on top of one set of stumps?', options: ['One', 'Two', 'Three'], answer: 1 },
  { q: 'How many runs is a ball hit over the boundary without bouncing worth?', options: ['Four', 'Five', 'Six'], answer: 2 },
  { q: 'How many runs is a ball worth if it bounces and then crosses the boundary?', options: ['Two', 'Four', 'Six'], answer: 1 },
  { q: 'A batter who is out without scoring has made a what?', options: ['Duck', 'Goose', 'Blank'], answer: 0 },
  { q: 'What is it called when a bowler takes three wickets with consecutive balls?', options: ['A treble', 'A hat-trick', 'A full house'], answer: 1 },
  { q: 'What is an over called when no runs are conceded from it?', options: ['A maiden', 'A blank', 'A dot'], answer: 0 },
  { q: 'Which club is the custodian of the Laws of Cricket?', options: ['Surrey County Cricket Club', 'Marylebone Cricket Club', 'Yorkshire County Cricket Club'], answer: 1 },
  { q: 'In a 50-over one-day international, what is the most overs one bowler may bowl?', options: ['Eight', 'Ten', 'Twelve'], answer: 1 },
  { q: 'In a Twenty20 match, what is the most overs one bowler may bowl?', options: ['Two', 'Four', 'Five'], answer: 1 },
  { q: 'Which fielder stands directly behind the stumps at the striker\'s end?', options: ['First slip', 'Wicketkeeper', 'Long stop'], answer: 1 },
  { q: 'What does the umpire signal by raising both arms above the head?', options: ['Six', 'Four', 'Wide'], answer: 0 },
  { q: 'What is a golden duck?', options: ['Out to the first ball you face', 'Out without facing a ball', 'Scoring zero in both innings'], answer: 0 },
  { q: 'How tall are the stumps in adult cricket?', options: ['24 inches', '28 inches', '32 inches'], answer: 1 },
  { q: 'Where does a yorker pitch?', options: ['Halfway down the pitch', 'At the batter\'s feet', 'Outside the wide line'], answer: 1 },
  { q: 'How many balls does each side face in a match of The Hundred?', options: ['100', '120', '150'], answer: 0 },
  { q: 'Which two countries play for the Ashes?', options: ['England and India', 'Australia and New Zealand', 'England and Australia'], answer: 2 },
  { q: 'What is the maximum width of a cricket bat?', options: ['3.75 inches', '4.25 inches', '5 inches'], answer: 1 },
  { q: 'What is a full-pitched ball that reaches the batter above waist height without bouncing called?', options: ['A beamer', 'A bouncer', 'A yorker'], answer: 0 },
  { q: 'What is a short ball that rises towards the batter\'s head called?', options: ['A beamer', 'A bouncer', 'A full toss'], answer: 1 },
  { q: 'In limited-overs cricket, what does the batting side get on the ball after a no-ball?', options: ['A free hit', 'Two extra runs', 'A powerplay'], answer: 0 },
  { q: 'What does DRS stand for?', options: ['Direct Replay System', 'Decision Review System', 'Dismissal Referral Service'], answer: 1 },
  { q: 'Under the Laws, how many penalty runs is a no-ball worth?', options: ['One', 'Two', 'None'], answer: 0 },
  { q: 'What is a lower-order batter sent in late in the day to protect a better batter called?', options: ['A pinch hitter', 'A nightwatchman', 'A sweeper'], answer: 1 },
  { q: 'How many balls does each side face in The Hundred?', options: ['100', '120', '150'], answer: 0 },
  { q: 'What does "c & b" mean on a scorecard?', options: ['Caught behind', 'Caught and bowled', 'Clean bowled'], answer: 1 },
  { q: 'Which of these is not a way of being out?', options: ['Timed out', 'Hit wicket', 'Foot fault'], answer: 2 },
  { q: 'How much does a men\'s cricket ball weigh?', options: ['4.5 to 4.75 ounces', '5.5 to 5.75 ounces', '6.5 to 6.75 ounces'], answer: 1 },
  { q: 'What colour ball is used in day-night Test matches?', options: ['White', 'Pink', 'Orange'], answer: 1 },
  { q: 'A score of 111 is known as what?', options: ['A Nelson', 'A Devil\'s number', 'A triple'], answer: 0 },
  { q: 'What is a batter\'s score of 100 or more called?', options: ['A ton-up', 'A century', 'A full house'], answer: 1 },
  { q: 'What is it called when a bowler takes five wickets in an innings?', options: ['A five-for', 'A handful', 'A hat-trick'], answer: 0 },
  { q: 'What is a dot ball?', options: ['A ball that hits the stumps', 'A ball no run is scored from', 'A ball bowled by a spinner'], answer: 1 },
  { q: 'Which ball from an off-spinner turns the opposite way to their usual one?', options: ['The doosra', 'The googly', 'The flipper'], answer: 0 },
  { q: 'Which ball from a leg-spinner turns the opposite way to their usual one?', options: ['The doosra', 'The googly', 'The arm ball'], answer: 1 },
  { q: 'In a T20 powerplay, how many fielders may stand outside the 30-yard circle?', options: ['Two', 'Four', 'Five'], answer: 0 },
  { q: 'What does the umpire signal by holding one arm out sideways?', options: ['Wide', 'No-ball', 'Bye'], answer: 1 },
  { q: 'What does the umpire signal by raising one index finger?', options: ['Out', 'One short', 'Last over'], answer: 0 },
  { q: 'What does the umpire signal by holding both arms out sideways?', options: ['No-ball', 'Dead ball', 'Wide'], answer: 2 },
  { q: 'What is the "corridor of uncertainty"?', options: ['The line just outside off stump', 'The gap between slip and gully', 'The walk back to the pavilion'], answer: 0 },
  { q: 'What is a leg bye?', options: ['A run after the ball hits the batter\'s body, not the bat', 'A run taken to the leg side', 'A no-ball down the leg side'], answer: 0 },
  { q: 'For a right-handed batter, which is the off side?', options: ['The side behind their legs', 'The side their bat faces as they take guard', 'Behind the wicketkeeper'], answer: 1 },
  { q: 'What is a tailender?', options: ['An opening batter', 'A batter low in the order, usually a bowler', 'The last fielder to arrive'], answer: 1 },
  { q: 'Under the Laws, how many penalty runs is a wide worth?', options: ['One', 'Two', 'None'], answer: 0 },
  { q: 'How many overs does each side bat in a Twenty20 match?', options: ['Ten', 'Twenty', 'Fifty'], answer: 1 },
];

// Three questions per day, the same for everyone, chosen from the date so no state is needed.
export function dailyQuestionIndexes(day: string): [number, number, number] {
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const picked: number[] = [];
  while (picked.length < 3) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const i = seed % QUIZ_BANK.length;
    if (!picked.includes(i)) picked.push(i);
  }
  return picked as [number, number, number];
}

/** The single question of the day for the mobile app's daily task. Different from the quiz's three. */
export function dailyQuestionIndex(day: string): number {
  let seed = 7;
  for (const ch of `${day}:one`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  // Scramble the bits: neighbouring dates differ only in their last character
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
  seed = (seed ^ (seed >>> 16)) >>> 0;
  return seed % QUIZ_BANK.length;
}
