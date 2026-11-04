export type Reward = {
  id:               string;
  title:            string;
  description:      string | null;
  image_url:        string | null;
  creds_cost:       number;
  category:         string | null;
  merchant_id:      string | null;
  awin_merchant_id: string | null;
  deep_link:        string | null;
  stock_count:      number | null;
  is_active:        boolean;
  created_at:       string;
  // Tango Card gift card fields
  tango_utid:        string | null;
  tango_amount_gbp:  number | null;
};

export type RedemptionResult = {
  redemptionId: string;
  scoresSpent:   number;
  balance:      number;
};
