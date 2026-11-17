// GET /api/juniors/:id → a child's record and consents, for a linked parent only

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getJuniorForParent, isUuid } from '@/lib/mobile/club-data';
import { fail, unauthorized } from '@/lib/utils/http';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const junior = isUuid(id) ? await getJuniorForParent(user.id, id) : null;
  // The same answer whether the child doesn't exist or isn't theirs
  if (!junior) return fail('Junior not found', 404);
  return NextResponse.json(junior);
}
