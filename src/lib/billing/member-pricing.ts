// Club-member player pricing. Pure rules: no database and no Stripe calls.
//
// Off unless NEXT_PUBLIC_CLUB_MEMBER_PRICING is exactly "true". A confirmed member of a
// club that is on an active paid SHIFTUP plan pays 20% less on every paid player tier.
// The prices below are the figures agreed for that discount (not a raw rounding of 20%).
// Free stays £0. Juniors and adults pay the same amounts. Who is allowed to pay differs.

export const CLUB_MEMBER_PRICING_FLAG = 'NEXT_PUBLIC_CLUB_MEMBER_PRICING';

export type PaidPlan = 'pro' | 'elite' | 'legend';
export type PlayerTier = 'free' | PaidPlan;
export type RateKind = 'individual' | 'club_member';
export type Payer = 'player' | 'parent' | 'club';

export const INDIVIDUAL_PENCE: Record<PlayerTier, number> = {
  free: 0,
  pro: 999,
  elite: 1499,
  legend: 1999,
};

export const MEMBER_PENCE: Record<PlayerTier, number> = {
  free: 0,
  pro: 799,
  elite: 1199,
  legend: 1599,
};

export const RENEWAL_NOTICE_DAYS = 14;

/** Stripe Price IDs Ishwar creates. This code only reads them. It never creates a Price or Product. */
export const STRIPE_PRICE_ENV: Record<'individual' | 'club_member' | 'club_seat', Record<PaidPlan, string>> = {
  individual: {
    pro: 'STRIPE_PRICE_PLAYER_PRO',
    elite: 'STRIPE_PRICE_PLAYER_ELITE',
    legend: 'STRIPE_PRICE_PLAYER_LEGEND',
  },
  club_member: {
    pro: 'STRIPE_PRICE_PLAYER_PRO_MEMBER',
    elite: 'STRIPE_PRICE_PLAYER_ELITE_MEMBER',
    legend: 'STRIPE_PRICE_PLAYER_LEGEND_MEMBER',
  },
  club_seat: {
    pro: 'STRIPE_PRICE_CLUB_SEAT_PRO',
    elite: 'STRIPE_PRICE_CLUB_SEAT_ELITE',
    legend: 'STRIPE_PRICE_CLUB_SEAT_LEGEND',
  },
};

const PAID: PaidPlan[] = ['pro', 'elite', 'legend'];

export function clubMemberPricingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[CLUB_MEMBER_PRICING_FLAG] === 'true';
}

/** A club join code, not a club name. Empty input is "clear". Anything else that is not a code is invalid. */
export function normaliseClubCode(raw: unknown): string | null | 'empty' {
  if (typeof raw !== 'string') return null;
  if (raw.trim() === '') return 'empty';
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4 || code.length > 12) return null;
  return code;
}

export function isPaidPlan(v: unknown): v is PaidPlan {
  return v === 'pro' || v === 'elite' || v === 'legend';
}

/**
 * The discount applies only when the club the player entered is a real SHIFTUP club,
 * that club is on an active paid plan, and the club has confirmed this player as a member.
 * A typed name that does not match a registered club, a free club plan, or a join
 * request that has not been confirmed all stay on the individual rate.
 */
export function memberDiscountEligible(input: {
  claimedClubId: string | null;
  clubRegistered: boolean;
  clubPaidPlanActive: boolean;
  confirmedMember: boolean;
}): boolean {
  return Boolean(input.claimedClubId && input.clubRegistered && input.clubPaidPlanActive && input.confirmedMember);
}

export function penceFor(plan: PlayerTier, memberRate: boolean): number {
  return memberRate ? MEMBER_PENCE[plan] : INDIVIDUAL_PENCE[plan];
}

export function priceIdFor(
  rate: 'individual' | 'club_member' | 'club_seat',
  plan: PaidPlan,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const key = STRIPE_PRICE_ENV[rate][plan];
  const id = env[key]?.trim();
  return id ? id : null;
}

export type PayerDecision =
  | { ok: true; payer: Payer; chargeUserId: string | null }
  | { ok: false; error: string };

/**
 * The player pays on their own card unless the club has opted to pay members' seats.
 * Under-18s are never charged on their own card: a verified parent or guardian pays, or the club does.
 */
export function decidePayer(input: {
  under18: boolean;
  clubPaysSeats: boolean;
  playerId: string;
  callerId: string;
  verifiedParentId: string | null;
}): PayerDecision {
  if (input.clubPaysSeats) return { ok: true, payer: 'club', chargeUserId: null };
  if (input.under18) {
    if (!input.verifiedParentId) {
      return { ok: false, error: 'A verified parent or guardian, or the club, needs to pay. A child\'s own card is not used.' };
    }
    if (input.callerId !== input.verifiedParentId) {
      return { ok: false, error: 'A verified parent or guardian needs to pay for this plan. A child\'s own card is not used.' };
    }
    if (input.verifiedParentId === input.playerId) {
      return { ok: false, error: 'A child\'s own card is not used.' };
    }
    return { ok: true, payer: 'parent', chargeUserId: input.verifiedParentId };
  }
  if (input.callerId !== input.playerId) {
    return { ok: false, error: 'Only the player can pay for this plan.' };
  }
  return { ok: true, payer: 'player', chargeUserId: input.playerId };
}

export type RenewalDecision = {
  rate: RateKind;
  /** Ask them, about 14 days before renewal, that the next bill will be the individual price. */
  notify: boolean;
  /** The paid period has ended and they are no longer eligible, so the next bill is the individual price. */
  switchNow: boolean;
};

/**
 * Leaving the club, or the club plan lapsing, does not change the price mid-period.
 * Another registered club that has confirmed them keeps the member rate.
 * Otherwise they are told before renewal and move to the individual price at renewal.
 */
export function renewalDecision(input: {
  now: Date;
  periodEnd: Date | null;
  onMemberRate: boolean;
  eligibleNow: boolean;
}): RenewalDecision {
  if (!input.onMemberRate) return { rate: 'individual', notify: false, switchNow: false };
  if (input.eligibleNow) return { rate: 'club_member', notify: false, switchNow: false };
  const end = input.periodEnd;
  if (!end || Number.isNaN(end.getTime())) return { rate: 'club_member', notify: false, switchNow: false };
  if (input.now.getTime() >= end.getTime()) return { rate: 'individual', notify: false, switchNow: true };
  const daysLeft = (end.getTime() - input.now.getTime()) / 86_400_000;
  return { rate: 'club_member', notify: daysLeft <= RENEWAL_NOTICE_DAYS, switchNow: false };
}

export function renewalEmail(input: { plan: PaidPlan; renewsOn: string }): { subject: string; text: string } {
  const individual = (INDIVIDUAL_PENCE[input.plan] / 100).toFixed(2);
  const member = (MEMBER_PENCE[input.plan] / 100).toFixed(2);
  return {
    subject: 'Your SHIFTUP plan price changes at renewal',
    text: [
      `Your club member price (£${member} a month) lasts until ${input.renewsOn}.`,
      `After that renewal the plan moves to the individual price (£${individual} a month), unless a registered club on a paid SHIFTUP plan has confirmed you as a member.`,
      'Free stays £0. Club plans still start from £29.99 a month.',
    ].join('\n\n'),
  };
}

/** One seat on the club invoice. Uses a Price Ishwar has already created. */
export function clubSeatLine(plan: PaidPlan, env: Record<string, string | undefined> = process.env): { price: string; quantity: 1; description: string } | null {
  const price = priceIdFor('club_seat', plan, env);
  if (!price) return null;
  const label = plan === 'pro' ? 'Pro' : plan === 'elite' ? 'Elite' : 'Legend';
  return { price, quantity: 1, description: `Member seat · ${label}` };
}

export type PricingCopy = {
  title: string;
  sub: string;
  tiers: Array<{ key: PlayerTier; label: string; price: string; memberPrice: string | null; period: string }>;
  tableHeaders: string[];
};

export function pricingCopy(memberRates: boolean): PricingCopy {
  const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  const tiers = (['free', 'pro', 'elite', 'legend'] as PlayerTier[]).map((key) => ({
    key,
    label: key === 'free' ? 'Free' : key === 'pro' ? 'Pro' : key === 'elite' ? 'Elite' : 'Legend',
    price: money(INDIVIDUAL_PENCE[key]),
    memberPrice: memberRates && key !== 'free' ? money(MEMBER_PENCE[key]) : null,
    period: key === 'free' ? 'Free tier' : 'per month',
  }));
  const sub = memberRates
    ? 'Start on Free (£0). Individual prices are Pro £9.99, Elite £14.99 and Legend £19.99 a month. Confirmed members of a club on a paid SHIFTUP plan pay Pro £7.99, Elite £11.99 and Legend £15.99. Club plans from £29.99 a month, set up with you.'
    : 'Start on Free (£0). Move up to Pro (£9.99), Elite (£14.99) or Legend (£19.99) when you want more. Club plans from £29.99 a month, set up with you.';
  return {
    title: 'Players start at £0. Clubs from £29.99 a month.',
    sub,
    tiers,
    tableHeaders: memberRates
      ? ['Feature', 'Free £0', 'Pro £9.99 (£7.99 club)', 'Elite £14.99 (£11.99 club)', 'Legend £19.99 (£15.99 club)']
      : ['Feature', 'Free', 'Pro £9.99', 'Elite £14.99', 'Legend £19.99'],
  };
}

export function pricingCopyAllows(copy: PricingCopy): boolean {
  const blob = `${copy.title}\n${copy.sub}\n${copy.tableHeaders.join(' ')}`.toLowerCase();
  return blob.includes('£29.99') && !blob.includes('free for players');
}

export const paidPlans = PAID;
