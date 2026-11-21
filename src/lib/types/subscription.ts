// ── Club Subscription Types ──────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'elite';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export type ClubSubscription = {
  id: string;
  club_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  max_members: number;
  max_scores_per_month: number;
  created_at: string;
  updated_at: string;
};

export type ClubStripeAccount = {
  id: string;
  club_id: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  country: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
};

// ── Scores Packs ─────────────────────────────────────────────────────────────

/** Price the club pays per 500 Scores (in pence). 500 Scores = £1 face value, sold at £1.50. */
export const SCORES_PACK_MARKUP = 1.5; // 50% markup
export const SCORES_PER_PACK_UNIT = 500;

export type ScoresPack = {
  id: string;
  name: string;
  scores_amount: number;
  price_pence: number;
  stripe_price_id: string | null;
  is_active: boolean;
  sort_order: number;
  description: string | null;
  created_at: string;
};

export type ScoresPackPurchase = {
  id: string;
  club_id: string;
  pack_id: string;
  purchased_by: string;
  scores_amount: number;
  price_pence: number;
  stripe_payment_intent: string | null;
  stripe_checkout_id: string | null;
  payment_status: 'pending' | 'succeeded' | 'failed';
  credited_to_club: boolean;
  credited_at: string | null;
  created_at: string;
};

// ── Tier limits and pricing ──────────────────────────────────────────────────

export const TIER_CONFIG: Record<
  SubscriptionTier,
  {
    label: string;
    monthlyPence: number;       // 0 = free
    annualPence: number;        // 0 = free
    maxMembers: number;
    maxScoresPerMonth: number;
    /**
     * What a member of a club on this plan pays each month, in pence, for analysis on their own
     * phone plus access to coaching and AI analysis sessions. 0 where the plan has no such add-on.
     */
    memberAnalysisAddOnPence: number;
    features: string[];
  }
> = {
  free: {
    label: 'Free',
    memberAnalysisAddOnPence: 0,
    monthlyPence: 0,
    annualPence: 0,
    maxMembers: 25,
    maxScoresPerMonth: 5_000,
    features: [
      'Up to 25 members',
      '5,000 Scores/month',
      'Basic Scores engine',
      'QR Scores Pay',
      'Volunteer check-in',
    ],
  },
  starter: {
    // Stored as 'starter'; shown as Pro. The keys are database values and have not moved.
    label: 'Pro',
    memberAnalysisAddOnPence: 299,
    monthlyPence: 2999,         // £29.99/mo
    annualPence: 29990,         // £299.90/yr (save 2 months)
    maxMembers: 75,
    maxScoresPerMonth: 20_000,
    features: [
      'Up to 75 members',
      '20,000 Scores/month',
      'Full Scores engine + weekly challenges',
      'Coaching marketplace',
      'Fixture availability',
      'Club noticeboard',
      'Finance tracker',
    ],
  },
  pro: {
    // Stored as 'pro'; shown as Elite.
    label: 'Elite',
    memberAnalysisAddOnPence: 499,
    monthlyPence: 5999,         // £59.99/mo
    annualPence: 59990,         // £599.90/yr
    maxMembers: 200,
    maxScoresPerMonth: 75_000,
    features: [
      'Up to 200 members',
      '75,000 Scores/month',
      'Everything in Pro',
      'AI Coach (MediaPipe analysis)',
      'Scratch cards + raffle',
      'Community pot + Sponsor a Kid',
      'Club Bible + documents',
      'Player form guide + Scout Mode',
    ],
  },
  elite: {
    // Stored as 'elite'; shown as Legend.
    label: 'Legend',
    memberAnalysisAddOnPence: 699,
    monthlyPence: 9999,         // £99.99/mo
    annualPence: 99990,         // £999.90/yr
    maxMembers: 999,
    maxScoresPerMonth: 250_000,
    features: [
      'Unlimited members',
      '250,000 Scores/month',
      'Everything in Elite',
      'Player auction + transfer window',
      'White-label branding',
      'Priority support',
      'Engagement-weighted payouts',
    ],
  },
};

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function tierLabel(tier: SubscriptionTier): string {
  return TIER_CONFIG[tier].label;
}

export function isSubscriptionActive(sub: Pick<ClubSubscription, 'status'>): boolean {
  return sub.status === 'active' || sub.status === 'trialing';
}
