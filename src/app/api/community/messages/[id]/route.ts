// GET  /api/community/messages/:connectionId          → the conversation
// POST /api/community/messages/:connectionId { body } → send, after the safety check

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen, getMessages, sendMessage } from '@/lib/community/service';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const result = await getMessages(user.id, (await params).id);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}

export async function POST(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { body?: unknown } | null;
  const result = await sendMessage(user.id, (await params).id, body?.body);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
