import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deliverDue } from '@/lib/safeguarding/alerts';

export const dynamic = 'force-dynamic';

/** Retry sweep for safeguarding alerts. Call it every minute with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const sent = await deliverDue(createAdminClient());
  return NextResponse.json({ sent });
}
