// GET  /api/academy/lessons/:id → the lesson and its three questions (no answers)
// POST /api/academy/lessons/:id  { answers: [0|1|2, 0|1|2, 0|1|2] } → marked, with the right answers and why

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getAcademyLesson, submitLesson } from '@/lib/academy/service';
import { parseAnswers } from '@/lib/academy/logic';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const lesson = await getAcademyLesson(user.id, id);
  if (!lesson) return fail('Lesson not found', 404);
  return NextResponse.json(lesson);
}

export async function POST(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const answers = parseAnswers(await readJson(req));
  if (!answers) return fail('Answer all three questions.', 400);

  const { id } = await params;
  const result = await submitLesson(user.id, id, answers);
  if (!result.ok) return fail(result.error, result.status);
  return NextResponse.json({
    results: result.results,
    score: result.score,
    passed: result.passed,
    firstPass: result.firstPass,
    amount: result.amount,
    trackBonus: result.trackBonus,
    trackDone: result.trackDone,
    badges: result.badges,
  });
}
