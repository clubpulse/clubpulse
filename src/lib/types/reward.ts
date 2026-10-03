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
};

export type RedemptionResult = {
  redemptionId: string;
  credsSpent:   number;
  balance:      number;
};
