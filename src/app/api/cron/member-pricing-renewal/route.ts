import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { clubMemberPricingEnabled, INDIVIDUAL_PENCE, isPaidPlan } from '@/lib/billing/member-pricing';
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
    .select('user_id, plan, kind, status, current_period_end, stripe_subscription_id')
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
      eligibleNow: assessed.eligible,
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
  return NextResponse.json({ notified, switched });
}
