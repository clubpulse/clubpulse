// POST /api/community/posts/:id/like → like or unlike

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, unauthorized } from '@/lib/utils/http';
import { communityOpen, toggleLike } from '@/lib/community/service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const result = await toggleLike(user.id, (await params).id);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
