-- ─────────────────────────────────────────────────────────────────────────────
-- Tango Card Gift Card Integration
--
-- Adds gift-card fields to rewards_catalogue and redemptions so we can:
--   1. Tag a reward as a Tango gift card (tango_utid + tango_amount_gbp)
--   2. Store the issued voucher token on the redemption row
--   3. Seed the initial gift card catalogue (Amazon, Tesco, Nike, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. rewards_catalogue — add Tango fields ─────────────────────────────────────
ALTER TABLE public.rewards_catalogue
  ADD COLUMN IF NOT EXISTS tango_utid        TEXT,         -- Tango UTID e.g. "U386185"
  ADD COLUMN IF NOT EXISTS tango_amount_gbp  NUMERIC(8,2); -- Face value in GBP e.g. 5.00

COMMENT ON COLUMN public.rewards_catalogue.tango_utid IS
  'Tango Card UTID for this gift card. NULL = not a Tango reward.';
COMMENT ON COLUMN public.rewards_catalogue.tango_amount_gbp IS
  'Face value of the gift card in GBP. Used in the Tango order payload.';

-- 2. redemptions — add voucher + status fields ────────────────────────────────
ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fulfilled', 'tango_pending', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS tango_reference      TEXT,  -- Tango referenceOrderID
  ADD COLUMN IF NOT EXISTS voucher_token        TEXT,  -- Redemption token / code
  ADD COLUMN IF NOT EXISTS voucher_instructions TEXT,  -- How to use the voucher
  ADD COLUMN IF NOT EXISTS voucher_expiry       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes                TEXT;  -- Internal notes / error messages

-- Players can read their own redemption voucher details
CREATE POLICY IF NOT EXISTS "redemptions: own read"
  ON public.redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Seed initial gift card catalogue ─────────────────────────────────────────
-- Tango UTIDs are from the sandbox catalogue; replace with live UTIDs before go-live.
-- Scores cost: 100 Scores = £1.00 face value.
-- So a £5 Amazon voucher costs 500 Scores.

INSERT INTO public.rewards_catalogue
  (title, description, image_url, creds_cost, category, tango_utid, tango_amount_gbp, is_active)
VALUES
  (
    'Amazon Gift Card £5',
    'Spend on millions of products at Amazon.co.uk.',
    'https://assets.tangocard.com/amazon-uk.png',
    500,
    'gift_card',
    'U793981',   -- Amazon UK £5 UTID (sandbox)
    5.00,
    true
  ),
  (
    'Amazon Gift Card £10',
    'Spend on millions of products at Amazon.co.uk.',
    'https://assets.tangocard.com/amazon-uk.png',
    1000,
    'gift_card',
    'U793982',   -- Amazon UK £10 UTID (sandbox)
    10.00,
    true
  ),
  (
    'Tesco Gift Card £5',
    'Use in store or online at Tesco.com.',
    'https://assets.tangocard.com/tesco.png',
    500,
    'gift_card',
    'U100001',   -- Tesco £5 UTID (sandbox)
    5.00,
    true
  ),
  (
    'Nike Gift Card £10',
    'Kit, trainers and sportswear at Nike.com.',
    'https://assets.tangocard.com/nike.png',
    1000,
    'gift_card',
    'U200001',   -- Nike £10 UTID (sandbox)
    10.00,
    true
  ),
  (
    'JD Sports Gift Card £10',
    'The leading trainer and sports fashion retailer.',
    'https://assets.tangocard.com/jd-sports.png',
    1000,
    'gift_card',
    'U300001',   -- JD Sports £10 UTID (sandbox)
    10.00,
    true
  ),
  (
    'Deliveroo Gift Card £5',
    'Order food from your favourite local restaurants.',
    'https://assets.tangocard.com/deliveroo.png',
    500,
    'gift_card',
    'U400001',   -- Deliveroo £5 UTID (sandbox)
    5.00,
    true
  )
ON CONFLICT DO NOTHING;
