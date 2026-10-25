-- Kit discounts are a category within rewards_catalogue. Add kit-specific metadata.
ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS discount_percent INTEGER CHECK (discount_percent BETWEEN 1 AND 100);
ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS voucher_code TEXT;  -- static code if applicable
ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS min_order_value INTEGER;  -- in pence

-- Kit discount categories
CREATE TABLE IF NOT EXISTS kit_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES kit_suppliers(id);

ALTER TABLE kit_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kit_suppliers: read all" ON kit_suppliers;
CREATE POLICY "kit_suppliers: read all" ON kit_suppliers FOR SELECT TO authenticated USING (is_active);

-- Seed sample kit suppliers
INSERT INTO kit_suppliers (name, description, website_url) VALUES
  ('Gray-Nicolls', 'Premium cricket bats, pads, gloves and kit', 'https://www.gray-nicolls.co.uk'),
  ('Kookaburra', 'Official cricket balls and quality cricket equipment', 'https://www.kookaburra.biz'),
  ('New Balance Cricket', 'Cricket boots, batting gloves and protective gear', 'https://www.newbalance.co.uk'),
  ('Gunn & Moore', 'Cricket bats, bags and protective equipment', 'https://www.gm.co.uk'),
  ('SS Cricket', 'Popular cricket bats and accessories', 'https://www.sscricket.com')
ON CONFLICT DO NOTHING;

-- Seed sample kit discount rewards
INSERT INTO rewards_catalogue (title, description, creds_cost, category, brand, discount_percent, is_active)
VALUES
  ('Gray-Nicolls 10% Off', '10% discount on any Gray-Nicolls bat or pad', 500, 'kit', 'Gray-Nicolls', 10, TRUE),
  ('Kookaburra Cricket Ball Deal', 'Discounted match balls for club use', 300, 'kit', 'Kookaburra', 15, TRUE),
  ('New Balance Cricket Boots', '£20 off any NB cricket footwear', 400, 'kit', 'New Balance', NULL, TRUE),
  ('GM Cricket Bag', '15% off any Gunn & Moore cricket bag', 350, 'kit', 'Gunn & Moore', 15, TRUE)
ON CONFLICT DO NOTHING;
