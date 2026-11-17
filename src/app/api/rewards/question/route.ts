// POST /api/rewards/question  { choice }  → answers today's cricket question (once a day)

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { answerQuestion } from '@/lib/mobile/rewards';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const choice = ((await readJson(req)) as { choice?: unknown } | null)?.choice;
  if (typeof choice !== 'number') return fail('Pick one of the answers.', 400);

  const answered = await answerQuestion(user.id, choice);
  if (!answered.ok) return fail(answered.error, answered.status);
  return NextResponse.json({ correct: answered.correct, answer: answered.answer });
}
