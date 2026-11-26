import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ageOn } from '@/lib/community/age';
import { ageVerificationEnabled } from '@/lib/age-verification/flag';
import { under13PurgeDue } from '@/lib/age-verification/rules';

export const dynamic = 'force-dynamic';

/** Deletes unconfirmed under-13 accounts after 14 days. Authorization: Bearer $CRON_SECRET. Does nothing unless the flag is on. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!ageVerificationEnabled()) return NextResponse.json({ skipped: true });

  const admin = createAdminClient();
  const { data: rows } = await admin.from('guardian_consents').select('user_id, confirmed_at, created_at').is('confirmed_at', null).limit(200);
  const now = new Date();
  let deleted = 0;
  for (const row of rows ?? []) {
    const { data: profile } = await admin.from('profiles').select('date_of_birth').eq('id', row.user_id as string).maybeSingle();
    const due = under13PurgeDue({
      createdAt: row.created_at as string,
      confirmedAt: (row.confirmed_at as string | null) ?? null,
      age: ageOn((profile?.date_of_birth as string | null) ?? null, now),
    }, now);
    if (!due) continue;
    const { error } = await admin.auth.admin.deleteUser(row.user_id as string);
    if (!error) deleted += 1;
  }
  return NextResponse.json({ deleted });
}
