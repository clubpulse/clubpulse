/**
 * In-App Purchase product catalogue and scratch card engine.
 *
 * Revenue streams:
 *  1. IAP revenue (70% after Apple's 30%)
 *  2. Awin affiliate commission (3-15% on redeemed discount codes)
 *  3. Engagement retention (scratch cards drive daily opens)
 *
 * TODO: Gambling Act review and age verification before paid scratch cards are sold.
 * Scores are NEVER sold directly. They are earned through participation; scratch cards
 * pay out discounts, and a Scores prize is a very rare top-tier bonus.
 */

/* ── IAP Products ── */

export type IAPProductId =
  | 'net_session_card'
  | 'match_day_card'
  | 'streak_shield'
  | 'streak_shield_3pack'
  | 'coach_ai_session'
  | 'coach_ai_3pack'
  | 'profile_badge'
  | 'sporting_soul_theme'
  | 'profile_frame';

export type IAPType = 'consumable' | 'non_consumable';

export interface IAPProduct {
  id: IAPProductId;
  name: string;
  description: string;
  priceGBP: 0.49 | 0.99;
  type: IAPType;
  icon: string;
  /** Apple App Store product identifier */
  appleProductId: string;
}

export const IAP_PRODUCTS: Record<IAPProductId, IAPProduct> = {
  net_session_card: {
    id: 'net_session_card',
    name: 'Net Session Card',
    description: 'Scratch 3 panels, then choose the discount you want. Some cards carry a bonus prize too.',
    priceGBP: 0.49,
    type: 'consumable',
    icon: '🏏',
    appleProductId: 'com.clubpulse.app.net_session_card',
  },
  match_day_card: {
    id: 'match_day_card',
    name: 'Match Day Card',
    description: 'Face a full over for bigger discounts to choose from. A wicket ends your innings!',
    priceGBP: 0.99,
    type: 'consumable',
    icon: '🏟️',
    appleProductId: 'com.clubpulse.app.match_day_card',
  },
  streak_shield: {
    id: 'streak_shield',
    name: 'Streak Shield',
    description: 'Protect your activity streak for 1 day if you miss your step goal.',
    priceGBP: 0.49,
    type: 'consumable',
    icon: '🛡️',
    appleProductId: 'com.clubpulse.app.streak_shield',
  },
  streak_shield_3pack: {
    id: 'streak_shield_3pack',
    name: 'Streak Shield 3-Pack',
    description: '3 streak shields bundled — save vs buying individually.',
    priceGBP: 0.99,
    type: 'consumable',
    icon: '🛡️',
    appleProductId: 'com.clubpulse.app.streak_shield_3pack',
  },
  coach_ai_session: {
    id: 'coach_ai_session',
    name: 'Coach AI Session',
    description: '1 premium AI coaching conversation — drill plans, technique analysis, match prep.',
    priceGBP: 0.49,
    type: 'consumable',
    icon: '🤖',
    appleProductId: 'com.clubpulse.app.coach_ai_session',
  },
  coach_ai_3pack: {
    id: 'coach_ai_3pack',
    name: 'Coach AI 3-Pack',
    description: '3 premium AI coaching sessions.',
    priceGBP: 0.99,
    type: 'consumable',
    icon: '🤖',
    appleProductId: 'com.clubpulse.app.coach_ai_3pack',
  },
  profile_badge: {
    id: 'profile_badge',
    name: 'Profile Badge',
    description: 'Collectible badge for your profile — seasonal and achievement-themed.',
    priceGBP: 0.49,
    type: 'non_consumable',
    icon: '🏅',
    appleProductId: 'com.clubpulse.app.profile_badge',
  },
  sporting_soul_theme: {
    id: 'sporting_soul_theme',
    name: 'Sporting Soul Theme',
    description: 'Premium visual theme for your Sporting Soul narrative page.',
    priceGBP: 0.99,
    type: 'non_consumable',
    icon: '🎨',
    appleProductId: 'com.clubpulse.app.sporting_soul_theme',
  },
  profile_frame: {
    id: 'profile_frame',
    name: 'Profile Frame',
    description: 'Animated profile frame visible to your whole club.',
    priceGBP: 0.99,
    type: 'non_consumable',
    icon: '✨',
    appleProductId: 'com.clubpulse.app.profile_frame',
  },
};

export const IAP_PRODUCTS_049 = Object.values(IAP_PRODUCTS).filter((p) => p.priceGBP === 0.49);
export const IAP_PRODUCTS_099 = Object.values(IAP_PRODUCTS).filter((p) => p.priceGBP === 0.99);

/* ── Awin Discount Categories ── */

export type AwinCategory =
  | 'sports_apparel'
  | 'sports_equipment'
  | 'groceries'
  | 'electronics'
  | 'general_value';

export interface AwinDeal {
  id: string;
  category: AwinCategory;
  brand: string;
  brandLogo?: string;
  discountLabel: string;        // e.g. "20% off", "£10 off"
  description: string;          // e.g. "New Balance cricket shoes"
  code: string;                 // discount code or affiliate deep-link
  affiliateUrl: string;         // Awin tracked URL
  expiresAt: string | null;     // ISO date or null if evergreen
  minSpend?: number;            // minimum basket in GBP
}

export const AWIN_CATEGORY_CONFIG: Record<AwinCategory, { label: string; icon: string; color: string }> = {
  sports_apparel:   { label: 'Sports Apparel',   icon: '👟', color: '#3B82F6' },
  sports_equipment: { label: 'Sports Equipment', icon: '🏏', color: '#22C55E' },
  groceries:        { label: 'Groceries',        icon: '🛒', color: '#F97316' },
  electronics:      { label: 'Electronics',      icon: '📱', color: '#8B5CF6' },
  general_value:    { label: 'Deals & More',     icon: '🏷️', color: '#EFC84A' },
};

/**
 * Example Awin deals — in production these come from the API / Supabase.
 * SHIFTUP signs up as an Awin publisher and rotates deals monthly.
 */
export const SAMPLE_AWIN_DEALS: AwinDeal[] = [
  // Sports Apparel
  { id: 'aw-1', category: 'sports_apparel', brand: 'Castore', discountLabel: '20% off', description: 'Cricket & sportswear range', code: 'SHIFTUP20', affiliateUrl: '', expiresAt: null },
  { id: 'aw-2', category: 'sports_apparel', brand: 'Under Armour', discountLabel: '£15 off', description: 'Orders over £75', code: 'CPULSE15', affiliateUrl: '', expiresAt: null, minSpend: 75 },
  { id: 'aw-3', category: 'sports_apparel', brand: 'New Balance', discountLabel: '15% off', description: 'Cricket shoes & trainers', code: 'PULSE15', affiliateUrl: '', expiresAt: null },
  { id: 'aw-4', category: 'sports_apparel', brand: 'Nike', discountLabel: '10% off', description: 'Full price items', code: 'CLUB10', affiliateUrl: '', expiresAt: null },
  // Sports Equipment
  { id: 'aw-5', category: 'sports_equipment', brand: 'Gray-Nicolls', discountLabel: '25% off', description: 'Cricket bats & gear', code: 'CPGN25', affiliateUrl: '', expiresAt: null },
  { id: 'aw-6', category: 'sports_equipment', brand: 'Kookaburra', discountLabel: '20% off', description: 'Bats, pads & gloves', code: 'CPKOOK20', affiliateUrl: '', expiresAt: null },
  { id: 'aw-7', category: 'sports_equipment', brand: 'Masuri', discountLabel: '15% off', description: 'Helmets & protection', code: 'CPMASK15', affiliateUrl: '', expiresAt: null },
  { id: 'aw-8', category: 'sports_equipment', brand: 'Decathlon', discountLabel: '10% off', description: 'All cricket equipment', code: 'CPDEC10', affiliateUrl: '', expiresAt: null },
  // Groceries
  { id: 'aw-9',  category: 'groceries', brand: 'MyProtein', discountLabel: '30% off', description: 'Protein & supplements', code: 'CPMP30', affiliateUrl: '', expiresAt: null },
  { id: 'aw-10', category: 'groceries', brand: 'Bulk', discountLabel: '25% off', description: 'Sports nutrition', code: 'CPBULK25', affiliateUrl: '', expiresAt: null },
  { id: 'aw-11', category: 'groceries', brand: 'Grenade', discountLabel: '£5 off', description: 'Protein bars & snacks', code: 'CPGREN5', affiliateUrl: '', expiresAt: null },
  { id: 'aw-12', category: 'groceries', brand: 'HelloFresh', discountLabel: '60% off', description: 'First box', code: 'CPHF60', affiliateUrl: '', expiresAt: null },
  // Electronics
  { id: 'aw-13', category: 'electronics', brand: 'Currys', discountLabel: '£10 off', description: 'Orders over £100', code: 'CPCURR10', affiliateUrl: '', expiresAt: null, minSpend: 100 },
  { id: 'aw-14', category: 'electronics', brand: 'Garmin', discountLabel: '15% off', description: 'Fitness watches & trackers', code: 'CPGARM15', affiliateUrl: '', expiresAt: null },
  { id: 'aw-15', category: 'electronics', brand: 'Amazon', discountLabel: '£5 off', description: 'Orders over £30', code: 'CPAMZ5', affiliateUrl: '', expiresAt: null, minSpend: 30 },
  // General Value
  { id: 'aw-16', category: 'general_value', brand: 'Sports Direct', discountLabel: '15% off', description: 'Everything in store', code: 'CPSD15', affiliateUrl: '', expiresAt: null },
  { id: 'aw-17', category: 'general_value', brand: 'ASOS', discountLabel: '20% off', description: 'Sportswear & lifestyle', code: 'CPASOS20', affiliateUrl: '', expiresAt: null },
  { id: 'aw-18', category: 'general_value', brand: 'JD Sports', discountLabel: '10% off', description: 'Full price items', code: 'CPJD10', affiliateUrl: '', expiresAt: null },
  { id: 'aw-19', category: 'general_value', brand: 'Uber Eats', discountLabel: '£3 off', description: 'Next 3 orders', code: 'CPUBER3', affiliateUrl: '', expiresAt: null },
  { id: 'aw-20', category: 'general_value', brand: 'Trainline', discountLabel: '10% off', description: 'Match day travel', code: 'CPTRAIN10', affiliateUrl: '', expiresAt: null },
];

/* ── Scratch Card Engine ── */

export type BallOutcome = 'dot' | 'single' | 'double' | 'boundary' | 'six' | 'wicket';

export interface ScratchPanel {
  outcome: BallOutcome;
  runs: number;
  revealed: boolean;
}

export type CardTier = 'net_session' | 'match_day';

export type PrizeTierName =
  // Net Session tiers
  | 'bowled' | 'steady_start' | 'building' | 'on_fire' | 'hat_trick_sixes'
  // Match Day tiers
  | 'golden_duck' | 'cameo' | 'useful_knock' | 'match_winner' | 'player_of_match' | 'yuvraj_moment';

export type PrizeType = 'scores' | 'streak_shield' | 'coach_ai_session' | 'profile_badge' | 'sporting_soul_theme' | 'profile_frame' | 'awin_deal' | 'gift_card_discount';

export interface Prize {
  type: PrizeType;
  label: string;
  value?: number;       // Scores amount, quantity for shields/sessions, or % for gift card discounts
  weight?: number;      // share of the tier's draws; defaults to 1
  awinDeal?: AwinDeal;  // populated when type === 'awin_deal'
}

export interface PrizeTier {
  name: PrizeTierName;
  label: string;
  emoji: string;
  minRuns: number;
  maxRuns: number;
  /** The card offers one brand discount from each of these categories */
  discountCategories: AwinCategory[];
  /** Gift card discount offered alongside the brand discounts, or null for none */
  giftCardPct: number | null;
  /** Chance (0–1) that the card also carries a bonus prize on top of the chosen discount */
  bonusChance: number;
  /** Pool the bonus is drawn from, by weight */
  bonuses: Prize[];
}

/* ── Ball generation ── */

const NET_SESSION_OUTCOMES: { outcome: BallOutcome; runs: number; weight: number }[] = [
  { outcome: 'dot',     runs: 0, weight: 20 },
  { outcome: 'single',  runs: 1, weight: 30 },
  { outcome: 'double',  runs: 2, weight: 20 },
  { outcome: 'boundary', runs: 4, weight: 20 },
  { outcome: 'six',     runs: 6, weight: 10 },
];

const MATCH_DAY_OUTCOMES: { outcome: BallOutcome; runs: number; weight: number }[] = [
  { outcome: 'wicket',   runs: 0, weight: 12 },
  { outcome: 'dot',      runs: 0, weight: 20 },
  { outcome: 'single',   runs: 1, weight: 25 },
  { outcome: 'double',   runs: 2, weight: 15 },
  { outcome: 'boundary', runs: 4, weight: 18 },
  { outcome: 'six',      runs: 6, weight: 10 },
];

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickAwinDeal(category?: AwinCategory): AwinDeal {
  const pool = category
    ? SAMPLE_AWIN_DEALS.filter((d) => d.category === category)
    : SAMPLE_AWIN_DEALS;
  return pickRandom(pool.length > 0 ? pool : SAMPLE_AWIN_DEALS);
}

/* ── Prize tier definitions ── */

/**
 * Every card is worth having: the player always chooses one discount from the
 * two or three on offer, and better innings unlock bigger gift card discounts.
 * On top of that, some cards carry a bonus prize. Scores are deliberately very
 * rare (well under 1 card in 100) and only ever appear as a top-tier bonus.
 */
export const NET_SESSION_TIERS: PrizeTier[] = [
  {
    name: 'bowled', label: 'Bowled!', emoji: '😬', minRuns: 0, maxRuns: 2,
    discountCategories: ['groceries', 'general_value', 'sports_equipment'], giftCardPct: null,
    bonusChance: 0, bonuses: [],
  },
  {
    name: 'steady_start', label: 'Steady Start', emoji: '👏', minRuns: 3, maxRuns: 8,
    discountCategories: ['sports_equipment', 'groceries'], giftCardPct: 5,
    bonusChance: 0.1,
    bonuses: [{ type: 'streak_shield', label: 'Streak Shield', value: 1 }],
  },
  {
    name: 'building', label: 'Building an Innings', emoji: '🔥', minRuns: 9, maxRuns: 12,
    discountCategories: ['sports_apparel', 'electronics'], giftCardPct: 10,
    bonusChance: 0.15,
    bonuses: [{ type: 'profile_badge', label: 'Collectible Badge', value: 1 }],
  },
  {
    name: 'on_fire', label: 'On Fire!', emoji: '🏆', minRuns: 13, maxRuns: 17,
    discountCategories: ['sports_apparel', 'sports_equipment'], giftCardPct: 15,
    bonusChance: 0.25,
    bonuses: [
      { type: 'profile_badge', label: 'Rare Badge', value: 1, weight: 3 },
      { type: 'scores', label: '75 Scores', value: 75, weight: 1 },
    ],
  },
  {
    name: 'hat_trick_sixes', label: 'HAT-TRICK OF SIXES!', emoji: '💥', minRuns: 18, maxRuns: 18,
    discountCategories: ['sports_apparel', 'sports_equipment'], giftCardPct: 20,
    bonusChance: 1,
    bonuses: [{ type: 'scores', label: '150 Scores + Exclusive Badge', value: 150 }],
  },
];

export const MATCH_DAY_TIERS: PrizeTier[] = [
  {
    name: 'golden_duck', label: 'Golden Duck', emoji: '🦆', minRuns: -1, maxRuns: 0,
    discountCategories: ['groceries', 'general_value', 'sports_equipment'], giftCardPct: null,
    bonusChance: 1,
    bonuses: [{ type: 'profile_badge', label: 'Golden Duck Badge', value: 1 }],
  },
  {
    name: 'cameo', label: 'Cameo', emoji: '👋', minRuns: 1, maxRuns: 6,
    discountCategories: ['groceries', 'general_value'], giftCardPct: 5,
    bonusChance: 0, bonuses: [],
  },
  {
    name: 'useful_knock', label: 'Useful Knock', emoji: '💪', minRuns: 7, maxRuns: 14,
    discountCategories: ['sports_equipment', 'electronics'], giftCardPct: 10,
    bonusChance: 0.1,
    bonuses: [{ type: 'coach_ai_session', label: 'Coach AI Session', value: 1 }],
  },
  {
    name: 'match_winner', label: 'Match Winner', emoji: '🏆', minRuns: 15, maxRuns: 24,
    discountCategories: ['sports_apparel', 'sports_equipment'], giftCardPct: 15,
    bonusChance: 0.15,
    bonuses: [{ type: 'streak_shield', label: 'Streak Shield', value: 1 }],
  },
  {
    name: 'player_of_match', label: 'Player of the Match', emoji: '⭐', minRuns: 25, maxRuns: 35,
    discountCategories: ['sports_apparel', 'sports_equipment'], giftCardPct: 20,
    bonusChance: 0.5,
    bonuses: [
      { type: 'sporting_soul_theme', label: 'Sporting Soul Theme', value: 1, weight: 3 },
      { type: 'scores', label: '200 Scores', value: 200, weight: 1 },
    ],
  },
  {
    name: 'yuvraj_moment', label: 'YUVRAJ MOMENT!', emoji: '🔥', minRuns: 36, maxRuns: 36,
    discountCategories: ['sports_apparel', 'sports_equipment'], giftCardPct: 20,
    bonusChance: 1,
    bonuses: [{ type: 'scores', label: '500 Scores + Exclusive Frame + Coach AI 3-Pack', value: 500 }],
  },
];

/** The discounts a card in this tier offers. The player keeps one. */
function buildChoices(tier: PrizeTier): Prize[] {
  const choices: Prize[] = tier.discountCategories.map((category) => {
    const deal = pickAwinDeal(category);
    return { type: 'awin_deal', label: `${deal.discountLabel} at ${deal.brand}`, awinDeal: deal };
  });
  if (tier.giftCardPct !== null) {
    choices.push({ type: 'gift_card_discount', label: `${tier.giftCardPct}% off a gift card`, value: tier.giftCardPct });
  }
  return choices;
}

function drawBonus(tier: PrizeTier): Prize | null {
  if (tier.bonuses.length === 0 || Math.random() >= tier.bonusChance) return null;
  return weightedRandom(tier.bonuses.map((prize) => ({ prize, weight: prize.weight ?? 1 }))).prize;
}

/* ── Core engine ── */

export interface ScratchCardResult {
  cardTier: CardTier;
  panels: ScratchPanel[];
  totalRuns: number;
  isWicket: boolean;          // Match Day: innings ended by wicket
  wicketBall: number | null;  // which ball (0-indexed) was the wicket
  prizeTier: PrizeTier;
  /** Discounts on offer — the player keeps one */
  choices: Prize[];
  /** Extra prize on top of the chosen discount, if the card carries one */
  bonus: Prize | null;
}

export function generateNetSessionCard(): ScratchCardResult {
  const panels: ScratchPanel[] = Array.from({ length: 3 }, () => {
    const pick = weightedRandom(NET_SESSION_OUTCOMES);
    return { outcome: pick.outcome, runs: pick.runs, revealed: false };
  });

  const totalRuns = panels.reduce((s, p) => s + p.runs, 0);
  const tier = NET_SESSION_TIERS.find((t) => totalRuns >= t.minRuns && totalRuns <= t.maxRuns)
    ?? NET_SESSION_TIERS[0];
  const choices = buildChoices(tier);
  const bonus = drawBonus(tier);

  return { cardTier: 'net_session', panels, totalRuns, isWicket: false, wicketBall: null, prizeTier: tier, choices, bonus };
}

export function generateMatchDayCard(): ScratchCardResult {
  const panels: ScratchPanel[] = [];
  let totalRuns = 0;
  let isWicket = false;
  let wicketBall: number | null = null;

  for (let i = 0; i < 6; i++) {
    const pick = weightedRandom(MATCH_DAY_OUTCOMES);
    panels.push({ outcome: pick.outcome, runs: pick.runs, revealed: false });

    if (pick.outcome === 'wicket') {
      isWicket = true;
      wicketBall = i;
      // Fill remaining balls as unrevealed dots (innings over)
      for (let j = i + 1; j < 6; j++) {
        panels.push({ outcome: 'dot', runs: 0, revealed: false });
      }
      break;
    }
    totalRuns += pick.runs;
  }

  // Golden duck: wicket on first ball — use special minRuns -1
  const lookupRuns = isWicket && wicketBall === 0 ? -1 : totalRuns;
  const tier = MATCH_DAY_TIERS.find((t) => lookupRuns >= t.minRuns && lookupRuns <= t.maxRuns)
    ?? MATCH_DAY_TIERS[0];
  const choices = buildChoices(tier);
  const bonus = drawBonus(tier);

  return { cardTier: 'match_day', panels, totalRuns, isWicket, wicketBall, prizeTier: tier, choices, bonus };
}

/* ── Published odds ── */

export interface PrizeOdds {
  label: string;
  /** Chance of this prize on any one card, 0–1 */
  probability: number;
}

export interface TierOdds {
  name: PrizeTierName;
  label: string;
  /** Chance of landing in this tier on any one card, 0–1 */
  probability: number;
  /** Discounts every card in this tier offers; the player keeps one */
  choices: string[];
  /** Bonus prizes, each with its chance on any one card */
  bonuses: PrizeOdds[];
}

/**
 * Exact odds for a card, derived from the same weights and tier tables the
 * generators above use, so the published figures cannot drift from the game.
 * App Store guideline 3.1.1 requires these to be shown before purchase.
 */
export function getCardOdds(cardTier: CardTier): TierOdds[] {
  const outcomes = cardTier === 'match_day' ? MATCH_DAY_OUTCOMES : NET_SESSION_OUTCOMES;
  const tiers = cardTier === 'match_day' ? MATCH_DAY_TIERS : NET_SESSION_TIERS;
  const balls = cardTier === 'match_day' ? 6 : 3;
  const totalWeight = outcomes.reduce((s, o) => s + o.weight, 0);

  // live: innings still in progress, keyed by runs so far. done: finished innings, keyed by
  // the value the generator looks the tier up with (-1 for a first-ball wicket).
  let live = new Map<number, number>([[0, 1]]);
  const done = new Map<number, number>();
  const add = (map: Map<number, number>, key: number, p: number) => map.set(key, (map.get(key) ?? 0) + p);

  for (let ball = 0; ball < balls; ball++) {
    const next = new Map<number, number>();
    for (const [runs, p] of live) {
      for (const o of outcomes) {
        const q = (p * o.weight) / totalWeight;
        if (o.outcome === 'wicket') add(done, ball === 0 ? -1 : runs, q);
        else add(next, runs + o.runs, q);
      }
    }
    live = next;
  }
  for (const [runs, p] of live) add(done, runs, p);

  const tierProbability = new Map<PrizeTierName, number>();
  for (const [lookupRuns, p] of done) {
    const tier = tiers.find((t) => lookupRuns >= t.minRuns && lookupRuns <= t.maxRuns) ?? tiers[0];
    tierProbability.set(tier.name, (tierProbability.get(tier.name) ?? 0) + p);
  }

  return tiers.map((tier) => {
    const probability = tierProbability.get(tier.name) ?? 0;
    const choices = tier.discountCategories.map((c) => `${AWIN_CATEGORY_CONFIG[c].label} brand discount`);
    if (tier.giftCardPct !== null) choices.push(`${tier.giftCardPct}% off a gift card`);
    const bonusWeight = tier.bonuses.reduce((sum, prize) => sum + (prize.weight ?? 1), 0);
    return {
      name: tier.name,
      label: tier.label,
      probability,
      choices,
      bonuses: tier.bonuses.map((prize) => ({
        label: prize.label,
        probability: (probability * tier.bonusChance * (prize.weight ?? 1)) / bonusWeight,
      })),
    };
  });
}

/** Formats a 0–1 probability for display, keeping rare prizes from rounding to 0%. */
export function formatOdds(probability: number): string {
  const pct = probability * 100;
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 0.1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.001) return `${pct.toFixed(3)}%`;
  return `1 in ${Math.round(1 / probability).toLocaleString('en-GB')}`;
}

/* ── Ball display helpers ── */

export const BALL_DISPLAY: Record<BallOutcome, { label: string; emoji: string; color: string; bgColor: string }> = {
  dot:      { label: 'Dot',      emoji: '⚪', color: '#9CA3AF', bgColor: 'rgba(156,163,175,0.15)' },
  single:   { label: 'Single',   emoji: '1️⃣',  color: '#60A5FA', bgColor: 'rgba(96,165,250,0.15)' },
  double:   { label: 'Double',   emoji: '2️⃣',  color: '#34D399', bgColor: 'rgba(52,211,153,0.15)' },
  boundary: { label: 'FOUR!',    emoji: '4️⃣',  color: '#FBBF24', bgColor: 'rgba(251,191,36,0.15)' },
  six:      { label: 'SIX!',     emoji: '6️⃣',  color: '#EFC84A', bgColor: 'rgba(239,200,74,0.2)' },
  wicket:   { label: 'WICKET!',  emoji: '🔴', color: '#F87171', bgColor: 'rgba(248,113,113,0.15)' },
};

/* ── Upsell trigger types ── */

export type UpsellTrigger =
  | 'streak_at_risk'       // Evening, streak about to expire
  | 'post_step_goal'       // Just hit daily step goal
  | 'post_scratch'         // Just finished a £0.49 card → upsell £0.99
  | 'wallet_nudge'         // Viewing wallet, wants more Scores
  | 'marketplace_short'    // Can't afford a marketplace item
  | 'coach_ai_tease'       // After free AI response
  | 'weekly_drop'          // Monday push notification
  | 'seasonal_fomo'        // Limited edition card
  | 'social_proof'         // Club feed — member won a prize
  | 'free_hit';            // First-time user free card

export interface UpsellConfig {
  trigger: UpsellTrigger;
  title: string;
  message: string;
  ctaLabel: string;
  ctaProduct: IAPProductId;
  /** Optional second CTA for scratch card alternative */
  altCtaLabel?: string;
  altCtaProduct?: IAPProductId;
}

export function getUpsell(trigger: UpsellTrigger, context?: { streakDays?: number; scoresShort?: number }): UpsellConfig {
  switch (trigger) {
    case 'streak_at_risk':
      return {
        trigger, title: `Your 🔥 ${context?.streakDays ?? 0}-day streak expires at midnight!`,
        message: 'Protect it now, or try your luck on a scratch card.',
        ctaLabel: 'Streak Shield · £0.49', ctaProduct: 'streak_shield',
        altCtaLabel: 'Scratch a Net Session', altCtaProduct: 'net_session_card',
      };
    case 'post_step_goal':
      return {
        trigger, title: '🔥 You smashed your step goal!',
        message: 'Carry the momentum — see what you can win.',
        ctaLabel: 'Scratch a Match Day Card · £0.99', ctaProduct: 'match_day_card',
        altCtaLabel: 'Net Session · £0.49', altCtaProduct: 'net_session_card',
      };
    case 'post_scratch':
      return {
        trigger, title: 'Think bigger? 🏟️',
        message: 'Match Day cards carry bigger brand discounts and up to 20% off gift cards.',
        ctaLabel: 'Match Day Card · £0.99', ctaProduct: 'match_day_card',
      };
    case 'wallet_nudge':
      return {
        trigger, title: 'Fancy a discount? 🏏',
        message: 'Scratch a card for brand discounts and money off gift cards.',
        ctaLabel: 'Scratch a Card', ctaProduct: 'net_session_card',
      };
    case 'marketplace_short':
      return {
        trigger, title: `${context?.scoresShort ?? 0} Scores short?`,
        message: 'Keep earning through steps and club activity. Meanwhile, a scratch card could cut the price with a gift card discount.',
        ctaLabel: 'Match Day Card · £0.99', ctaProduct: 'match_day_card',
        altCtaLabel: 'Net Session · £0.49', altCtaProduct: 'net_session_card',
      };
    case 'coach_ai_tease':
      return {
        trigger, title: 'Want a personalised drill plan? 🏏',
        message: 'Unlock premium AI coaching — or scratch a card for a chance to win a session.',
        ctaLabel: 'Coach AI Session · £0.49', ctaProduct: 'coach_ai_session',
        altCtaLabel: 'Scratch a Net Session', altCtaProduct: 'net_session_card',
      };
    case 'weekly_drop':
      return {
        trigger, title: 'Your weekly scratch card is here 🏏',
        message: 'Brand discounts and gift card discounts are up for grabs. What will you win?',
        ctaLabel: 'Match Day Card · £0.99', ctaProduct: 'match_day_card',
        altCtaLabel: 'Net Session · £0.49', altCtaProduct: 'net_session_card',
      };
    case 'seasonal_fomo':
      return {
        trigger, title: '🏆 LIMITED EDITION — Available 5 days only',
        message: "Exclusive seasonal badge only from this card. Don't miss it.",
        ctaLabel: 'Scratch Now · £0.99', ctaProduct: 'match_day_card',
      };
    case 'social_proof':
      return {
        trigger, title: '🎉 A club member just won big!',
        message: 'See what you could win — brand discounts, gift card discounts, and exclusive badges.',
        ctaLabel: 'Try a Card', ctaProduct: 'net_session_card',
      };
    case 'free_hit':
      return {
        trigger, title: 'Welcome to SHIFTUP! 🏏',
        message: "Here's your free Net Session scratch card — scratch to win discounts and more.",
        ctaLabel: 'Scratch Your Free Card', ctaProduct: 'net_session_card',
      };
  }
}
