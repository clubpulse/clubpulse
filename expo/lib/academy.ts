// Shapes returned by the Academy API (see src/lib/academy on the server).

export type AcademyLessonRow = { id: string; title: string; minutes: number; passed: boolean; bestScore: number | null };
export type AcademyTrack = {
  key: string;
  icon: string;
  title: string;
  blurb: string;
  done: number;
  total: number;
  lessons: AcademyLessonRow[];
};
export type PlanDay = { day: number; title: string; minutes: number; activity: string; lessonId: string | null; lessonTitle: string | null };
export type AcademyPlan = { summary: string; days: PlanDay[]; focus: string; createdAt: string; fromCoachAi: boolean };
export type Academy = {
  unavailable: string | null;
  level: { title: string; passed: number; total: number; next: { title: string; at: number } | null };
  tracks: AcademyTrack[];
  scores: { lesson: number; track: number };
  plan: AcademyPlan | null;
  plansLeftThisWeek: number;
};
export type AcademyLesson = {
  id: string;
  trackTitle: string;
  title: string;
  minutes: number;
  intro: string;
  points: string[];
  tryIt: string;
  questions: Array<{ q: string; options: string[] }>;
  passed: boolean;
  bestScore: number | null;
};
export type LessonResult = {
  results: Array<{ correct: boolean; answer: number; why: string }>;
  score: number;
  passed: boolean;
  firstPass: boolean;
  amount: number;
  trackBonus: number;
  trackDone: string | null;
};
