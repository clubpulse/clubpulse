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

export const BILLING_TERMS = ['month', 'quarter', 'year'] as const;
export type BillingTerm = (typeof BILLING_TERMS)[number];
export type BillingInterval = BillingTerm;
export type RateCause = 'none' | 'club_lapsed' | 'player_left';

/** Monthly figures. Quarterly and annual are the agreed term prices, not a raw multiple. */
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

export const INDIVIDUAL_TERMS: Record<PaidPlan, Record<BillingTerm, number>> = {
  pro: { month: 999, quarter: 2699, year: 9999 },
  elite: { month: 1499, quarter: 3999, year: 14999 },
  legend: { month: 1999, quarter: 5399, year: 19999 },
};

export const MEMBER_TERMS: Record<PaidPlan, Record<BillingTerm, number>> = {
  pro: { month: 799, quarter: 2199, year: 7999 },
  elite: { month: 1199, quarter: 3199, year: 11999 },
  legend: { month: 1599, quarter: 4299, year: 15999 },
};

/** Club plans already in the database: starter is shown as Pro, pro as Elite, elite as Legend. */
export const CLUB_PLAN_TERMS = {
  starter: { month: 2999, quarter: 7999, year: 29999 },
  pro: { month: 5999, quarter: 16199, year: 59999 },
  elite: { month: 9999, quarter: 26999, year: 99999 },
} as const;
export type ClubPlanTier = keyof typeof CLUB_PLAN_TERMS;

export const RENEWAL_NOTICE_DAYS = 14;
export const RESUBSCRIBE_DAYS = 90;

const TERM_SUFFIX: Record<BillingTerm, string> = { month: 'MONTH', quarter: 'QUARTER', year: 'YEAR' };

export function stripePriceEnv(rate: 'individual' | 'club_member' | 'club_seat', plan: PaidPlan, term: BillingTerm = 'month'): string {
  const planName = plan.toUpperCase();
  if (rate === 'individual') return `STRIPE_PRICE_PLAYER_${planName}_${TERM_SUFFIX[term]}`;
  if (rate === 'club_member') return `STRIPE_PRICE_PLAYER_${planName}_MEMBER_${TERM_SUFFIX[term]}`;
  return `STRIPE_PRICE_CLUB_SEAT_${planName}_${TERM_SUFFIX[term]}`;
}

export function clubPlanPriceEnv(tier: ClubPlanTier, term: BillingTerm): string {
  return `STRIPE_PRICE_CLUB_${tier.toUpperCase()}_${TERM_SUFFIX[term]}`;
}

/** All Price IDs Ishwar needs to create. This code only reads them. */
export function allStripePriceEnvKeys(): string[] {
  const keys: string[] = [];
  for (const plan of ['pro', 'elite', 'legend'] as PaidPlan[]) {
    for (const term of BILLING_TERMS) {
      keys.push(stripePriceEnv('individual', plan, term));
      keys.push(stripePriceEnv('club_member', plan, term));
      keys.push(stripePriceEnv('club_seat', plan, term));
    }
  }
  for (const tier of Object.keys(CLUB_PLAN_TERMS) as ClubPlanTier[]) {
    for (const term of BILLING_TERMS) keys.push(clubPlanPriceEnv(tier, term));
  }
  return keys;
}

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

export function isBillingTerm(v: unknown): v is BillingTerm {
  return v === 'month' || v === 'quarter' || v === 'year';
}

/** Under-18s start on a year paid by a parent or guardian. A month or a quarter is still allowed. */
export function defaultTerm(under18: boolean): BillingTerm {
  return under18 ? 'year' : 'month';
}

export const CLUB_BACS_FLAG = 'STRIPE_CLUB_BACS_DEBIT';

/** Optional Bacs Direct Debit on club invoices. Off unless this is exactly "true". */
export function clubBacsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[CLUB_BACS_FLAG] === 'true';
}

export function clubInvoicePaymentMethods(env: Record<string, string | undefined> = process.env): Array<'card' | 'bacs_debit'> {
  return clubBacsEnabled(env) ? ['card', 'bacs_debit'] : ['card'];
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

export function penceFor(plan: PlayerTier, memberRate: boolean, term: BillingTerm = 'month'): number {
  if (plan === 'free') return 0;
  return memberRate ? MEMBER_TERMS[plan][term] : INDIVIDUAL_TERMS[plan][term];
}

export function clubPlanPence(tier: ClubPlanTier, term: BillingTerm): number {
  return CLUB_PLAN_TERMS[tier][term];
}

export function priceIdFor(
  rate: 'individual' | 'club_member' | 'club_seat',
  plan: PaidPlan,
  env: Record<string, string | undefined> = process.env,
  term: BillingTerm = 'month',
): string | null {
  const id = env[stripePriceEnv(rate, plan, term)]?.trim();
  return id ? id : null;
}

export function clubPlanPriceId(tier: ClubPlanTier, term: BillingTerm, env: Record<string, string | undefined> = process.env): string | null {
  const id = env[clubPlanPriceEnv(tier, term)]?.trim();
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
  /** Tell the player the price will change, once the change is within 14 days. */
  notify: boolean;
  /** The grace has ended, so the next bill is the individual price. */
  switchNow: boolean;
  protectedUntil: Date | null;
};

const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function seasonKey(now: Date): string {
  return String(now.getUTCFullYear());
}

/**
 * The price already paid holds until that term ends, whether the club plan lapses or the player leaves.
 * Eligibility is checked again at renewal, not during the term.
 */
export function memberRateProtectedUntil(input: { periodEnd: Date; termEnd: Date | null }): Date {
  return input.termEnd ?? input.periodEnd;
}

/** A reminder goes out before a renewal that costs more, and before every renewal a parent is charged. */
export function renewalReminderDue(input: {
  now: Date;
  renewsAt: Date | null;
  priceRises: boolean;
  chargedToParent: boolean;
}): boolean {
  if (!input.renewsAt || Number.isNaN(input.renewsAt.getTime())) return false;
  const daysLeft = (input.renewsAt.getTime() - input.now.getTime()) / DAY_MS;
  if (daysLeft <= 0 || daysLeft > RENEWAL_NOTICE_DAYS) return false;
  return input.priceRises || input.chargedToParent;
}

export function renewalDecision(input: {
  now: Date;
  onMemberRate: boolean;
  /** Still confirmed by a paid registered club, including one they joined instead. */
  qualifiesNow: boolean;
  cause: RateCause;
  periodEnd: Date | null;
  interval?: BillingInterval;
  termEnd?: Date | null;
  chargedToParent?: boolean;
}): RenewalDecision {
  const end = input.periodEnd && !Number.isNaN(input.periodEnd.getTime()) ? input.periodEnd : null;
  const until = end ? memberRateProtectedUntil({ periodEnd: end, termEnd: input.termEnd ?? null }) : null;
  const priceRises = input.onMemberRate && !input.qualifiesNow && input.cause !== 'none';
  const notify = renewalReminderDue({
    now: input.now,
    renewsAt: until,
    priceRises,
    chargedToParent: !!input.chargedToParent,
  });
  if (!input.onMemberRate) return { rate: 'individual', notify, switchNow: false, protectedUntil: until };
  if (input.qualifiesNow || input.cause === 'none' || !until) return { rate: 'club_member', notify, switchNow: false, protectedUntil: until };
  if (input.now.getTime() >= until.getTime()) return { rate: 'individual', notify: false, switchNow: true, protectedUntil: until };
  return { rate: 'club_member', notify, switchNow: false, protectedUntil: until };
}

/** A confirmation from an earlier season still counts when the club was away for 90 days or less. */
export function confirmationCarries(input: {
  confirmedSeason: string | null;
  currentSeason: string;
  lapsedAt: Date | null;
  resumedAt: Date | null;
}): boolean {
  if (!input.confirmedSeason) return false;
  if (input.confirmedSeason === input.currentSeason) return true;
  if (!input.lapsedAt || !input.resumedAt) return false;
  const gap = input.resumedAt.getTime() - input.lapsedAt.getTime();
  return gap >= 0 && gap <= RESUBSCRIBE_DAYS * DAY_MS;
}

/** Clubs confirm only as many members as the plan allows, and a new season needs a new confirmation. */
export function rosterRoom(input: {
  confirmedThisSeason: number;
  limit: number;
  alreadyConfirmedThisSeason: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (input.alreadyConfirmedThisSeason) return { ok: true };
  if (input.confirmedThisSeason >= input.limit) {
    return { ok: false, error: 'This club has confirmed as many members as its plan allows. Re-confirm the squad next season within that limit.' };
  }
  return { ok: true };
}

export type LapseNotice = 'before' | 'on_day';

/** One notice 14 days before the club plan ends, and one on the day it ends. */
export function clubLapseNotices(input: { now: Date; clubPeriodEnd: Date; sent: LapseNotice[] }): LapseNotice[] {
  const end = input.clubPeriodEnd.getTime();
  const days = (end - input.now.getTime()) / DAY_MS;
  const due: LapseNotice[] = [];
  if (days <= RENEWAL_NOTICE_DAYS && days > 0 && !input.sent.includes('before')) due.push('before');
  const sameDay = input.now.toISOString().slice(0, 10) === input.clubPeriodEnd.toISOString().slice(0, 10);
  if (sameDay && !input.sent.includes('on_day')) due.push('on_day');
  return due;
}

export function clubLapseEmail(input: { when: LapseNotice; endsOn: string }): { subject: string; text: string } {
  const when = input.when === 'before'
    ? `The club plan ends on ${input.endsOn}.`
    : `The club plan ends today (${input.endsOn}).`;
  return {
    subject: input.when === 'before' ? 'A SHIFTUP club plan ends in 14 days' : 'A SHIFTUP club plan ends today',
    text: [
      when,
      'The price already paid holds until the end of that term, even if the club plan lapses or a player leaves. Eligibility is checked again at renewal.',
      'If the club takes a paid plan again within 90 days, confirmed members return to the member rate at their next renewal without being confirmed again. After 90 days the club confirms them again.',
      'Club plans still start from £29.99 a month.',
    ].join('\n\n'),
  };
}

export function renewalEmail(input: { plan: PaidPlan; renewsOn: string; term?: BillingTerm; chargedToParent?: boolean }): { subject: string; text: string } {
  const term = input.term ?? 'month';
  const individual = (INDIVIDUAL_TERMS[input.plan][term] / 100).toFixed(2);
  const member = (MEMBER_TERMS[input.plan][term] / 100).toFixed(2);
  const subject = input.chargedToParent
    ? 'A SHIFTUP plan paid by a parent renews soon'
    : 'Your SHIFTUP plan price changes at renewal';
  return {
    subject,
    text: [
      input.chargedToParent
        ? `A parent or guardian is paying for this plan. It renews on ${input.renewsOn}.`
        : `The price already paid (£${member}) holds until ${input.renewsOn}.`,
      `At renewal the price is checked again. If the member rate no longer applies, it becomes the individual price (£${individual}).`,
      'Free stays £0. Club plans still start from £29.99 a month.',
    ].join('\n\n'),
  };
}

/** One seat on the club invoice. Uses a Price Ishwar has already created. */
export function clubSeatLine(plan: PaidPlan, env: Record<string, string | undefined> = process.env, term: BillingTerm = 'month'): { price: string; quantity: 1; description: string } | null {
  const price = priceIdFor('club_seat', plan, env, term);
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

const TERM_PERIOD: Record<BillingTerm, string> = { month: 'per month', quarter: 'per quarter', year: 'per year' };

export function pricingCopy(memberRates: boolean, term: BillingTerm = 'month'): PricingCopy {
  const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  const tiers = (['free', 'pro', 'elite', 'legend'] as PlayerTier[]).map((key) => ({
    key,
    label: key === 'free' ? 'Free' : key === 'pro' ? 'Pro' : key === 'elite' ? 'Elite' : 'Legend',
    price: money(key === 'free' ? 0 : INDIVIDUAL_TERMS[key][term]),
    memberPrice: memberRates && key !== 'free' ? money(MEMBER_TERMS[key][term]) : null,
    period: key === 'free' ? 'Free tier' : TERM_PERIOD[term],
  }));
  const sub = memberRates
    ? 'Start on Free (£0). Pay monthly, quarterly or annually. Individual monthly prices are Pro £9.99, Elite £14.99 and Legend £19.99. Confirmed club members pay Pro £7.99, Elite £11.99 and Legend £15.99 a month, with the same 20% off a quarter or a year. Club plans are £29.99 a month, £79.99 a quarter or £299.99 a year.'
    : 'Start on Free (£0). Move up to Pro (£9.99), Elite (£14.99) or Legend (£19.99) when you want more. Club plans from £29.99 a month, set up with you.';
  const header = (tier: typeof tiers[number]) => tier.memberPrice ? `${tier.label} ${tier.price} (${tier.memberPrice} club)` : `${tier.label} ${tier.price}`;
  return {
    title: 'Players start at £0. Clubs from £29.99 a month.',
    sub,
    tiers,
    tableHeaders: ['Feature', ...tiers.map(header)],
  };
}

export function pricingCopyAllows(copy: PricingCopy): boolean {
  const blob = `${copy.title}\n${copy.sub}\n${copy.tableHeaders.join(' ')}`.toLowerCase();
  return blob.includes('£29.99') && !blob.includes('free for players');
}

export const paidPlans = PAID;
