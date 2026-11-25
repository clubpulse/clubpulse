import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { clubLapseEmail, clubLapseNotices, clubMemberPricingEnabled, INDIVIDUAL_PENCE, isPaidPlan, type LapseNotice } from '@/lib/billing/member-pricing';
import { assessMemberPricing, renewalWork, type RenewalRow } from '@/lib/billing/member-pricing-server';
import { getStripe } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';

/** About 14 days before renewal, email anyone leaving the member price. At renewal, point the subscription at the individual Price. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!clubMemberPricingEnabled()) return NextResponse.json({ skipped: true });

  const admin = createAdminClient();
  const { data } = await admin.from('player_subscriptions')
    .select('user_id, plan, kind, status, payer, current_period_end, stripe_subscription_id, billing_interval, term_end, member_club_id')
    .eq('kind', 'club_member')
    .in('status', ['active', 'trialing', 'past_due']);

  let notified = 0;
  let switched = 0;
  const now = new Date();
  for (const row of data ?? []) {
    if (!isPaidPlan(row.plan)) continue;
    const assessed = await assessMemberPricing(admin, row.user_id as string, now);
    const { data: profile } = await admin.from('profiles').select('email').eq('id', row.user_id).maybeSingle();
    const work = renewalWork({
      userId: row.user_id as string,
      email: (profile?.email as string | null) ?? null,
      plan: row.plan,
      onMemberRate: true,
      periodEnd: (row.current_period_end as string | null) ?? null,
      qualifiesNow: assessed.eligible,
      cause: assessed.cause,
      interval: row.billing_interval === 'quarter' || row.billing_interval === 'year' ? row.billing_interval : 'month',
      chargedToParent: row.payer === 'parent',
      termEnd: (row.term_end as string | null) ?? null,
      stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    } satisfies RenewalRow, now);
    if (work.notify) {
      const sent = await sendEmail(work.notify);
      if (sent) notified += 1;
    }
    if (work.switchTo && row.stripe_subscription_id) {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id as string);
      const item = sub.items.data[0];
      if (!item) continue;
      await stripe.subscriptions.update(row.stripe_subscription_id as string, {
        items: [{ id: item.id, price: work.switchTo }],
        proration_behavior: 'none',
      });
      await admin.from('player_subscriptions').update({
        kind: 'individual',
        price_pence: INDIVIDUAL_PENCE[row.plan],
        payer: 'player',
        updated_at: now.toISOString(),
      }).eq('user_id', row.user_id);
      switched += 1;
    }
  }
  const clubNotices = await sendClubLapseNotices(admin, now);
  return NextResponse.json({ notified, switched, clubNotices });
}

async function sendClubLapseNotices(admin: ReturnType<typeof createAdminClient>, now: Date): Promise<number> {
  const { data: subs } = await admin.from('club_subscriptions').select('club_id, status, cancel_at_period_end, current_period_end').in('status', ['active', 'trialing', 'past_due', 'canceled', 'unpaid']);
  let sent = 0;
  for (const sub of subs ?? []) {
    const ending = sub.cancel_at_period_end === true || sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'past_due';
    if (!ending || !sub.current_period_end) continue;
    const periodEnd = new Date(sub.current_period_end as string);
    const endDate = periodEnd.toISOString().slice(0, 10);
    const { data: prior } = await admin.from('club_lapse_notices').select('notice').eq('club_id', sub.club_id).eq('period_end', endDate);
    const due = clubLapseNotices({ now, clubPeriodEnd: periodEnd, sent: (prior ?? []).map((n) => n.notice as LapseNotice) });
    if (due.length === 0) continue;
    const { data: members } = await admin.from('club_members').select('user_id, role').eq('club_id', sub.club_id).eq('is_active', true);
    const ids = (members ?? []).map((m) => m.user_id as string);
    const { data: profiles } = ids.length ? await admin.from('profiles').select('id, email').in('id', ids) : { data: [] as Array<{ id: string; email: string | null }> };
    const clubIds = new Set((members ?? []).filter((m) => m.role === 'club_admin').map((m) => m.user_id as string));
    for (const notice of due) {
      const mail = clubLapseEmail({ when: notice, endsOn: endDate });
      for (const profile of profiles ?? []) {
        if (!profile.email) continue;
        const audienceMail = clubIds.has(profile.id as string) ? mail : { ...mail, subject: mail.subject.replace('club plan', 'club’s plan') };
        if (await sendEmail({ to: profile.email as string, ...audienceMail })) sent += 1;
      }
      await admin.from('club_lapse_notices').insert({ club_id: sub.club_id, notice, period_end: endDate });
    }
  }
  return sent;
}
