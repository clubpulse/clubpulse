// GET  /api/community/posts/:id/comments          → replies
// POST /api/community/posts/:id/comments { body } → reply, after the safety check

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { addComment, communityOpen, getComments } from '@/lib/community/service';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const result = await getComments(user.id, (await params).id);
  return result.success ? NextResponse.json({ comments: result.data }) : fail(result.error);
}

export async function POST(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { body?: unknown } | null;
  const result = await addComment(user.id, (await params).id, body?.body);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
