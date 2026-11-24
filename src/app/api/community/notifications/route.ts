// GET  /api/community/notifications            → your notifications, newest first, and how many are unread
// POST /api/community/notifications { id? }    → mark one read, or all when no id is given

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { readJson, unauthorized, fail } from '@/lib/utils/http';
import { communityOpen } from '@/lib/community/service';
import { getNotifications, markRead } from '@/lib/community/notify';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  return NextResponse.json(await getNotifications(createAdminClient(), user.id));
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { id?: unknown } | null;
  await markRead(createAdminClient(), user.id, typeof body?.id === 'string' ? body.id : undefined);
  return NextResponse.json({ ok: true });
}
