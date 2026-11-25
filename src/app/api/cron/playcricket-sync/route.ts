import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncPlayCricket } from '@/lib/playcricket/sync';
import { playCricketSyncEnabled } from '@/lib/playcricket/flag';

export const dynamic = 'force-dynamic';

/**
 * Overnight cache and after-match result pull. Call with Authorization: Bearer $CRON_SECRET.
 * The job is read-only against Play-Cricket and does nothing unless the flag is exactly "true".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!playCricketSyncEnabled()) return NextResponse.json({ skipped: true });

  const fetchImpl = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  };
  const result = await syncPlayCricket(createAdminClient(), fetchImpl);
  return NextResponse.json(result);
}
