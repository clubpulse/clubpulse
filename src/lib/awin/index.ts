// ─────────────────────────────────────────────
// ClubPulse: Awin Affiliate Integration
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

// Sports merchants to apply to on Awin
export const SPORTS_MERCHANTS: AwinMerchant[] = [
  {
    id:          '6556',
    name:        'Decathlon',
    sport:       'multi-sport',
    deepLink:    'https://www.decathlon.co.uk/sport/cricket',
    commission:  3,
    description: 'Affordable kit for all levels',
  },
  {
    id:          '2435',
    name:        'JD Sports',
    sport:       'multi-sport',
    deepLink:    'https://www.jdsports.co.uk',
    commission:  3,
    description: 'Footwear and training apparel',
  },
  {
    id:          '11491',
    name:        'Castore',
    sport:       'cricket',
    deepLink:    'https://castore.com/collections/cricket',
    commission:  8,
    description: 'Premium cricket and training kit',
  },
];

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
