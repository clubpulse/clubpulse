export type Merchant = {
  id:   string;   // the merchant's user id (rewards_catalogue.merchant_id)
  name: string;
};

export type SpendPattern = {
  category:    string;
  redemptions: number;
  scores_spent: number;
};

export type PeakWindow = {
  dayOfWeek: number;   // 0 = Sunday
  hour:      number;   // 0-23, UTC
  count:     number;
};

export type RoleBreakdown = {
  role:        string;
  redemptions: number;
};

// Aggregated and anonymised. Buckets with fewer than MIN_COHORT redemptions are suppressed.
export type RedemptionInsight = {
  totalRedemptions: number;
  topCategories:    SpendPattern[];
  peakWindows:      PeakWindow[];
  roleBreakdown:    RoleBreakdown[];
  summary:          string;
};

export const MIN_COHORT = 5;
