'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { createPlan, submitLesson } from '@/lib/academy/service';
import { parseAnswers, parsePlanRequest } from '@/lib/academy/logic';

/** Marks a lesson's check on the server. The answers come back only after marking. */
export async function submitLessonAction(lessonId: string, answers: number[]) {
  const user = await requireUser();
  const parsed = parseAnswers({ answers });
  if (!parsed) return { ok: false as const, error: 'Answer all three questions.' };
  const result = await submitLesson(user.id, lessonId, parsed);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath('/academy');
  return {
    ok: true as const, results: result.results, score: result.score, passed: result.passed, firstPass: result.firstPass,
    amount: result.amount, trackBonus: result.trackBonus, trackDone: result.trackDone, badges: result.badges,
  };
}

export async function createPlanAction(input: unknown) {
  const user = await requireUser();
  const request = parsePlanRequest(input);
  if (typeof request === 'string') return { ok: false as const, error: request };
  const created = await createPlan(user.id, request);
  if (!created.ok) return { ok: false as const, error: created.error };
  revalidatePath('/academy/plan');
  return { ok: true as const, plansLeftThisWeek: created.plansLeftThisWeek };
}
