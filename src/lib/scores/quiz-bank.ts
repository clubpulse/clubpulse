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
