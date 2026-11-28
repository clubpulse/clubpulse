import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ageOn } from '@/lib/community/age';
import { safeguardingLeadEmail } from '@/lib/age-verification/alert';
import { ageVerificationEnabled } from '@/lib/age-verification/flag';
import { purgeDecision } from '@/lib/age-verification/rules';
import { sendEmail } from '@/lib/email/resend';
import { sendHandoverNotices } from '@/lib/age-verification/handover';
import { markPurged, recordPurge, sendPurgeAlerts } from '@/lib/age-verification/purge';

export const dynamic = 'force-dynamic';

/** Deletes unconfirmed under-13 accounts 14 days after the profile was created. Authorization: Bearer $CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!ageVerificationEnabled()) return NextResponse.json({ skipped: true });

  const admin = createAdminClient();
  const now = new Date();
  const thirteen = new Date(now);
  thirteen.setUTCFullYear(thirteen.getUTCFullYear() - 13);
  const fourteen = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const { data: profiles, error } = await admin.from('profiles')
    .select('id, date_of_birth, created_at, dob_confirmed_by, dob_confirmed_at')
    .gt('date_of_birth', thirteen.toISOString().slice(0, 10))
    .lte('created_at', fourteen)
    .limit(200);
  if (error) {
    console.error('[age-verification] could not list under-13 profiles');
    return NextResponse.json({ error: 'Could not list accounts.' }, { status: 500 });
  }
  let deleted = 0;
  let alerted = 0;
  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    const age = ageOn(profile.date_of_birth as string | null, now);
    if (age === null || age >= 13) continue;
    const [{ data: consent }, { data: parentLink }] = await Promise.all([
      admin.from('guardian_consents').select('confirmed_at').eq('user_id', userId).maybeSingle(),
      admin.from('child_profiles').select('id, parent_child_links!inner(verified_at)').eq('linked_user_id', userId).limit(1),
    ]);
    const verifiedParent = (parentLink ?? []).some((row) => {
      const links = Array.isArray(row.parent_child_links) ? row.parent_child_links : [row.parent_child_links];
      return links.some((link) => !!(link as { verified_at?: string | null } | null)?.verified_at);
    });
    const decision = purgeDecision({
      age,
      createdAt: (profile.created_at as string | null) ?? '',
      guardianConfirmed: !!(consent as { confirmed_at?: string | null } | null)?.confirmed_at,
      clubConfirmed: !!(profile.dob_confirmed_by && profile.dob_confirmed_at),
      verifiedParent,
    }, now);
    if (decision === 'keep') continue;
    if (decision === 'alert') {
      const sent = await sendEmail({
        to: safeguardingLeadEmail(),
        subject: 'SHIFTUP safeguarding: under-13 consent still outstanding',
        text: `An under-13 account (${userId}) is past 14 days without guardian email confirmation. It was not deleted because a club confirmation or a verified parent link is on file. No date of birth is included.`,
      });
      if (!sent) console.error('[age-verification] could not alert the club about an under-13 account', { userId });
      else alerted += 1;
      continue;
    }
    // The lasting record comes first. Without it the account stays, because the deletion could not be shown afterwards.
    const record = await recordPurge(admin, userId);
    if (!record) continue;
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[age-verification] could not delete an unconfirmed under-13 account', { userId });
      continue;
    }
    await markPurged(admin, record.id, now);
    console.info('[age-verification] deleted unconfirmed under-13 account', { userId, recordId: record.id });
    deleted += 1;
  }
  // Tell the clubs. Alerts that failed earlier are retried here until they go out.
  const purgeAlerts = await sendPurgeAlerts(admin);
  const handovers = await sendHandoverNotices(admin);
  return NextResponse.json({ deleted, alerted, purgeAlertsSent: purgeAlerts.sent, purgeAlertsFailed: purgeAlerts.failed, handoverNoticesSent: handovers.sent, handoverNoticesFailed: handovers.failed });
}
