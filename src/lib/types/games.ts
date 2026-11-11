export type GameKey = 'spin' | 'quiz' | 'timing' | 'hilo';

export type GameInfo = {
  key: GameKey;
  enabled: boolean;      // club has the rule switched on
  locked: string | null; // reason the player cannot play (age gate, no match data), or null
  played: boolean;       // finished today
  amount: number;        // Scores won today
  score: number;
  value: number;         // rule value (per correct answer / top prize)
};

export type GamesState = {
  clubId: string;
  earnedToday: number;
  weekly: { cap: number | null; used: number };
  games: Record<GameKey, GameInfo>;
};

// Fractions of the Daily Spin top prize on each of the eight segments, in wheel order.
export const SPIN_SEGMENTS = [0.1, 0.2, 0.1, 0.5, 0.1, 0.2, 0.1, 1] as const;

export const QUIZ_LENGTH = 3;
export const TIMING_BALLS = 3;
export const HILO_ROUNDS = 4;

export type QuizView = { questions: Array<{ q: string; options: string[] }> };
export type QuizResult = { correctAnswers: number[]; correct: number; amount: number; capped: boolean };

export type HiloView = { round: number; rounds: number; a: { name: string; runs: number }; b: { name: string } };
export type HiloPick = {
  wasCorrect: boolean;
  revealedRuns: number;
  finished: boolean;
  correct: number;
  amount: number;
  capped: boolean;
  next: HiloView | null;
};
