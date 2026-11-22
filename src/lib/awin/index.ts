// ─────────────────────────────────────────────
// ShiftUp: Awin Affiliate Integration
// Publisher ID: 3107853
// ─────────────────────────────────────────────

export const AWIN_PUBLISHER_ID = '3107853';

export type AwinMerchant = {
  id:          string;   // Awin advertiser ID
  name:        string;
  sport:       string;
  deepLink:    string;   // Base product/category URL
  commission:  number;   // % commission rate
  description: string;
};

// ── Scratch Card Discount Categories ──────────────────────
export type AwinCategory =
  | 'sports_apparel'
  | 'sports_equipment'
  | 'groceries'
  | 'electronics'
  | 'general_value';

export type AwinDeal = {
  id:           string;
  merchantId:   string;
  merchantName: string;
  category:     AwinCategory;
  title:        string;
  code:         string;
  discountPct:  number;
  deepLink:     string;
  expiresAt:    string | null;
};

export const AWIN_CATEGORIES: Record<AwinCategory, { label: string; icon: string; color: string }> = {
  sports_apparel:   { label: 'Sports Apparel',   icon: '👕', color: '#3B82F6' },
  sports_equipment: { label: 'Sports Equipment', icon: '🏏', color: '#22C55E' },
  groceries:        { label: 'Groceries',        icon: '🛒', color: '#F97316' },
  electronics:      { label: 'Electronics',      icon: '📱', color: '#8B5CF6' },
  general_value:    { label: 'General Value',    icon: '🏷️', color: '#EFC84A' },
};

// ── All Awin Merchants (keyed by category) ───────────────
export type AwinMerchantWithCategory = AwinMerchant & {
  category: AwinCategory;
};

export const AWIN_MERCHANTS: AwinMerchantWithCategory[] = [
  // ── Sports Apparel ──
  {
    id: '2435',   name: 'JD Sports',  sport: 'multi-sport',  category: 'sports_apparel',
    deepLink: 'https://www.jdsports.co.uk', commission: 3,
    description: 'Footwear and training apparel',
  },
  {
    id: '11491',  name: 'Castore',    sport: 'cricket',      category: 'sports_apparel',
    deepLink: 'https://castore.com/collections/cricket', commission: 8,
    description: 'Premium cricket and training kit',
  },
  {
    id: '6461',   name: 'Nike',       sport: 'multi-sport',  category: 'sports_apparel',
    deepLink: 'https://www.nike.com/gb/', commission: 5,
    description: 'Performance training & lifestyle',
  },
  // ── Sports Equipment ──
  {
    id: '6556',   name: 'Decathlon',   sport: 'multi-sport',  category: 'sports_equipment',
    deepLink: 'https://www.decathlon.co.uk/sport/cricket', commission: 3,
    description: 'Affordable kit for all levels',
  },
  {
    id: '15311',  name: 'Gray-Nicolls', sport: 'cricket',     category: 'sports_equipment',
    deepLink: 'https://www.gray-nicolls.co.uk', commission: 7,
    description: 'Professional cricket bats & gear',
  },
  // ── Groceries ──
  {
    id: '10498',  name: 'Sainsburys',  sport: 'nutrition',    category: 'groceries',
    deepLink: 'https://www.sainsburys.co.uk', commission: 2,
    description: 'Weekly shop & sports nutrition',
  },
  {
    id: '9498',   name: 'Myprotein',   sport: 'nutrition',    category: 'groceries',
    deepLink: 'https://www.myprotein.com', commission: 8,
    description: 'Protein & sports supplements',
  },
  // ── Electronics ──
  {
    id: '3776',   name: 'Currys',      sport: 'general',      category: 'electronics',
    deepLink: 'https://www.currys.co.uk', commission: 1,
    description: 'Tech, wearables & fitness trackers',
  },
  {
    id: '5575',   name: 'Amazon UK',   sport: 'general',      category: 'electronics',
    deepLink: 'https://www.amazon.co.uk', commission: 3,
    description: 'Everything tech & accessories',
  },
  // ── General Value ──
  {
    id: '14487',  name: 'ASOS',        sport: 'lifestyle',    category: 'general_value',
    deepLink: 'https://www.asos.com', commission: 5,
    description: 'Fashion & lifestyle',
  },
  {
    id: '3022',   name: 'eBay UK',     sport: 'general',      category: 'general_value',
    deepLink: 'https://www.ebay.co.uk', commission: 2,
    description: 'Deals on everything',
  },
];

// Legacy alias
export const SPORTS_MERCHANTS: AwinMerchant[] = AWIN_MERCHANTS;

/**
 * Build a tracked Awin affiliate link.
 * clickRef ties the click to a specific user for cashback attribution.
 *
 * Format: https://www.awin1.com/cread.php?awinmid={mid}&awinaffid={pub}&clickref={userId}&p={encodedUrl}
 */
export function buildAwinLink(
  merchantId:  string,
  destinationUrl: string,
  clickRef:    string   // user.id from Supabase Auth
): string {
  const encoded = encodeURIComponent(destinationUrl);
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${AWIN_PUBLISHER_ID}&clickref=${clickRef}&p=${encoded}`;
}

/**
 * Convert a raw Awin commission amount (in GBP pence or £) to Scores.
 * 50 Scores = £1, so commission × 50 = Scores (pass amount in pounds).
 */
export function commissionToScores(commissionGBP: number): number {
  return Math.floor(commissionGBP * 50);
}

/**
 * Split a Scores award between the athlete (80%) and their club (20%).
 * Returns integer values; club gets the remainder.
 */
export function calcShoppingSplit(totalScores: number): {
  athleteScores: number;
  clubScores:    number;
} {
  const athleteScores = Math.floor(totalScores * 0.8);
  const clubScores    = totalScores - athleteScores;
  return { athleteScores, clubScores };
}

/**
 * Get all merchants for a given scratch card discount category.
 */
export function getMerchantsByCategory(category: AwinCategory): AwinMerchantWithCategory[] {
  return AWIN_MERCHANTS.filter((m) => m.category === category);
}

/**
 * Pick a random category for a scratch card prize.
 * Weighted so sports categories appear more often.
 */
const CATEGORY_WEIGHTS: [AwinCategory, number][] = [
  ['sports_apparel',   30],
  ['sports_equipment', 25],
  ['groceries',        20],
  ['electronics',      10],
  ['general_value',    15],
];

export function pickRandomCategory(): AwinCategory {
  const total = CATEGORY_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [cat, weight] of CATEGORY_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return cat;
  }
  return 'general_value';
}

/**
 * Build a deal object from a merchant + discount info (used by scratch card prizes).
 */
export function buildDeal(
  merchant:    AwinMerchantWithCategory,
  discountPct: number,
  code:        string,
  expiresAt:   string | null = null
): AwinDeal {
  return {
    id:           `deal_${merchant.id}_${Date.now()}`,
    merchantId:   merchant.id,
    merchantName: merchant.name,
    category:     merchant.category,
    title:        `${discountPct}% off at ${merchant.name}`,
    code,
    discountPct,
    deepLink:     merchant.deepLink,
    expiresAt,
  };
}
