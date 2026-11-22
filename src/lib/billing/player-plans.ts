// Pure rules for what a player can buy online. No database and no Stripe here, so it can be tested.
//
// A player on their own buys Pro, Elite or Legend. A member of a club that has a paid plan buys
// one add-on instead, priced by the club's plan, for analysis on their own phone plus coaching
// and AI analysis sessions.

import { TIER_CONFIG, type SubscriptionTier } from '@/lib/types/subscription';

export type PlayerPlan = 'pro' | 'elite' | 'legend';
export type PlanKind = 'individual' | 'club_addon';

export const PLAYER_PLANS: Record<PlayerPlan, { label: string; pence: number }> = {
  pro: { label: 'Pro', pence: 999 },
  elite: { label: 'Elite', pence: 1499 },
  legend: { label: 'Legend', pence: 1999 },
};

/** The club tier keys are older than the names people see: starter shows as Pro, and so on. */
const CLUB_TIER_TO_PLAN: Partial<Record<SubscriptionTier, PlayerPlan>> = { starter: 'pro', pro: 'elite', elite: 'legend' };

export type PlanOption = { plan: PlayerPlan; label: string; pence: number };
export type Offer = { kind: PlanKind; options: PlanOption[] };

/** What this player may buy. `clubTier` is their club's plan, or null with no club. */
export function offerFor(clubTier: SubscriptionTier | null, clubPlanActive: boolean): Offer {
  const plan = clubTier ? CLUB_TIER_TO_PLAN[clubTier] : undefined;
  const addOn = clubTier ? TIER_CONFIG[clubTier].memberAnalysisAddOnPence : 0;
  if (clubPlanActive && plan && addOn > 0) {
    return { kind: 'club_addon', options: [{ plan, label: `${PLAYER_PLANS[plan].label} member add-on`, pence: addOn }] };
  }
  return {
    kind: 'individual',
    options: (Object.keys(PLAYER_PLANS) as PlayerPlan[]).map((p) => ({ plan: p, label: PLAYER_PLANS[p].label, pence: PLAYER_PLANS[p].pence })),
  };
}

export const isPlayerPlan = (v: unknown): v is PlayerPlan => v === 'pro' || v === 'elite' || v === 'legend';

/** A subscription in one of these states still gives access. past_due: Stripe is retrying the card. */
export const isLive = (status: string | null | undefined): boolean =>
  status === 'active' || status === 'trialing' || status === 'past_due';

/** One Stripe price per kind, plan and amount, so a price change makes a new price, not a silent edit. */
export const lookupKey = (kind: PlanKind, plan: PlayerPlan, pence: number): string =>
  `clubpulse_player_${kind}_${plan}_${pence}_monthly`;

export const pounds = (pence: number): string => `£${(pence / 100).toFixed(2)}`;
