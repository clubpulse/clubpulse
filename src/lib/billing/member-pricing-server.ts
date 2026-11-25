// Server-side club-member pricing. Reads the database. Does not create Stripe prices.
// The flag gates every path here. Callers keep the older offer when the flag is off.

import type { SupabaseClient } from '@supabase/supabase-js';
import { ageOn } from '@/lib/community/age';
import { isLive } from '@/lib/billing/player-plans';
import {
  clubSeatLine,
  decidePayer,
  defaultTerm,
  isBillingTerm,
  isPaidPlan,
  penceFor,
  priceIdFor,
  renewalDecision,
  renewalEmail,
  type BillingTerm,
  type BillingInterval,
  confirmationCarries,
  seasonKey,
  type PaidPlan,
  type Payer,
  type RateCause,
  type RateKind,
} from '@/lib/billing/member-pricing';

type Admin = SupabaseClient;

const PAID_TIERS = new Set(['starter', 'pro', 'elite']);

export type MemberAssessment = {
  claimedClubId: string | null;
  eligible: boolean;
  under18: boolean;
  clubPaysSeats: boolean;
  verifiedParentId: string | null;
  rate: RateKind;
  pence: Record<PaidPlan, number>;
  cause: RateCause;
};

export async function assessMemberPricing(admin: Admin, userId: string, now = new Date()): Promise<MemberAssessment> {
  const { data: profile } = await admin.from('profiles').select('claimed_club_id, date_of_birth').eq('id', userId).maybeSingle();
  const claimedClubId = (profile?.claimed_club_id as string | null) ?? null;
  const age = ageOn((profile?.date_of_birth as string | null) ?? null, now);

  const [{ data: memberships }, { data: links }, { data: subRow }] = await Promise.all([
    admin.from('club_members').select('club_id, is_active, is_junior, confirmed_season').eq('user_id', userId),
    admin.from('child_profiles').select('linked_user_id, parent_child_links ( parent_id, verified_at )').eq('linked_user_id', userId),
    admin.from('player_subscriptions').select('member_club_id').eq('user_id', userId).maybeSingle(),
  ]);

  const season = seasonKey(now);
  const markedJunior = (memberships ?? []).some((m) => m.is_junior === true && m.is_active === true);
  const clubIds = [...new Set((memberships ?? []).map((m) => m.club_id as string).concat(claimedClubId ? [claimedClubId] : []))];
  const pricedClubId = (subRow?.member_club_id as string | null) ?? claimedClubId;

  let clubPaysSeats = false;
  let pricedClubLapsed = false;
  let stillOnPricedClub = false;
  let eligible = false;
  for (const clubId of clubIds) {
    const [{ data: club }, { data: sub }] = await Promise.all([
      admin.from('clubs').select('id').eq('id', clubId).maybeSingle(),
      admin.from('club_subscriptions').select('tier, status, pays_member_seats, lapsed_at, resumed_at').eq('club_id', clubId).maybeSingle(),
    ]);
    const member = (memberships ?? []).find((m) => m.club_id === clubId && m.is_active === true);
    const paid = !!sub && PAID_TIERS.has(sub.tier as string) && isLive(sub.status as string);
    const confirmed = confirmationCarries({
      confirmedSeason: (member?.confirmed_season as string | null) ?? null,
      currentSeason: season,
      lapsedAt: sub?.lapsed_at ? new Date(sub.lapsed_at as string) : null,
      resumedAt: sub?.resumed_at ? new Date(sub.resumed_at as string) : null,
    });
    if (clubId === pricedClubId && member) stillOnPricedClub = true;
    if (clubId === pricedClubId && !!club && !paid) pricedClubLapsed = true;
    if (club && paid && confirmed) eligible = true;
    if (clubId === claimedClubId && paid && member) clubPaysSeats = sub?.pays_member_seats === true;
  }
  const cause: RateCause = eligible ? 'none' : stillOnPricedClub && pricedClubLapsed ? 'club_lapsed' : 'player_left';

  const parents = (links ?? []).flatMap((row) => {
    const raw = row.parent_child_links as { parent_id?: string; verified_at?: string | null } | Array<{ parent_id?: string; verified_at?: string | null }> | null;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.filter((l) => l.verified_at && l.parent_id).map((l) => l.parent_id as string);
  });

  const rate: RateKind = eligible ? 'club_member' : 'individual';
  return {
    claimedClubId,
    eligible,
    under18: (age !== null && age < 18) || markedJunior,
    clubPaysSeats,
    verifiedParentId: parents[0] ?? null,
    rate,
    pence: {
      pro: penceFor('pro', eligible),
      elite: penceFor('elite', eligible),
    legend: penceFor('legend', eligible),
  },
  cause,
};
}

export type CheckoutPrep =
  | { ok: true; payer: Payer; chargeUserId: string | null; priceId: string | null; pence: number; rate: RateKind; seat: ReturnType<typeof clubSeatLine> }
  | { ok: false; error: string; status: number };

/** What to charge, or the club-invoice line. Never creates a Stripe Price. */
export function prepareMemberCheckout(input: {
  plan: unknown;
  term?: unknown;
  assessment: MemberAssessment;
  playerId: string;
  callerId: string;
  env?: Record<string, string | undefined>;
}): CheckoutPrep & { term?: BillingTerm } {
  if (!isPaidPlan(input.plan)) return { ok: false, error: 'Choose a plan.', status: 400 };
  const term = isBillingTerm(input.term) ? input.term : defaultTerm(input.assessment.under18);
  const payer = decidePayer({
    under18: input.assessment.under18,
    clubPaysSeats: input.assessment.clubPaysSeats,
    playerId: input.playerId,
    callerId: input.callerId,
    verifiedParentId: input.assessment.verifiedParentId,
  });
  if (!payer.ok) return { ok: false, error: payer.error, status: 403 };
  const memberRate = input.assessment.rate === 'club_member';
  const pence = penceFor(input.plan, memberRate, term);
  if (payer.payer === 'club') {
    const seat = clubSeatLine(input.plan, input.env, term);
    if (!seat) return { ok: false, error: 'The club seat price is not configured yet.', status: 503 };
    return { ok: true, payer: 'club', chargeUserId: null, priceId: seat.price, pence, rate: input.assessment.rate, seat, term };
  }
  const priceId = priceIdFor(input.assessment.rate, input.plan, input.env, term);
  if (!priceId) return { ok: false, error: 'That plan is not configured yet.', status: 503 };
  return { ok: true, payer: payer.payer, chargeUserId: payer.chargeUserId, priceId, pence, rate: input.assessment.rate, seat: null, term };
}

export type RenewalRow = {
  userId: string;
  email: string | null;
  plan: PaidPlan;
  onMemberRate: boolean;
  periodEnd: string | null;
  qualifiesNow: boolean;
  cause: RateCause;
  interval?: BillingInterval;
  termEnd?: string | null;
  chargedToParent?: boolean;
  stripeSubscriptionId: string | null;
};

export function renewalWork(row: RenewalRow, now: Date): { notify: { to: string; subject: string; text: string } | null; switchTo: string | null } {
  const periodEnd = row.periodEnd ? new Date(row.periodEnd) : null;
  const decision = renewalDecision({
    now,
    periodEnd,
    onMemberRate: row.onMemberRate,
    qualifiesNow: row.qualifiesNow,
    cause: row.cause,
    interval: row.interval,
    termEnd: row.termEnd ? new Date(row.termEnd) : null,
    chargedToParent: row.chargedToParent,
  });
  const renewsOn = (decision.protectedUntil ?? periodEnd)?.toISOString().slice(0, 10) ?? '';
  const notify = decision.notify && row.email ? { to: row.email, ...renewalEmail({ plan: row.plan, renewsOn, term: row.interval, chargedToParent: row.chargedToParent }) } : null;
  const switchTo = decision.switchNow ? priceIdFor('individual', row.plan) : null;
  return { notify, switchTo };
}
