-- ─────────────────────────────────────────────────────────────────────────────
-- Club Backend: Subscriptions, Stripe Connect & Scores Pack Purchasing
--
-- The revenue engine. Clubs subscribe to ClubPulse (monthly/annual), connect
-- their Stripe account via Connect, and buy Scores packs to distribute to
-- members.
--
-- Business rules:
--   • 500 Scores = £1 face value
--   • Clubs buy Scores packs at £1.50 per 500 Scores (50% markup = revenue)
--   • Flat 5% application fee on Stripe Connect destination charges
--   • B2B settlement only — no FCA e-money scope
--
-- Tables:
--   club_stripe_accounts   — Stripe Connect account per club
--   club_subscriptions     — subscription status per club
--   scores_packs           — catalogue of purchasable Scores packs
--   scores_pack_purchases  — ledger of all pack purchases
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. club_stripe_accounts ─────────────────────────────────────────────────────
-- One row per club: links to their Stripe Connect account.
CREATE TABLE IF NOT EXISTS public.club_stripe_accounts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID        NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  stripe_account_id     TEXT        NOT NULL,              -- acct_xxx
  onboarding_complete   BOOLEAN     NOT NULL DEFAULT FALSE,
  charges_enabled       BOOLEAN     NOT NULL DEFAULT FALSE,
  payouts_enabled       BOOLEAN     NOT NULL DEFAULT FALSE,
  details_submitted     BOOLEAN     NOT NULL DEFAULT FALSE,
  country               TEXT        NOT NULL DEFAULT 'GB',
  default_currency      TEXT        NOT NULL DEFAULT 'gbp',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.club_stripe_accounts_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER club_stripe_accounts_updated_at
  BEFORE UPDATE ON public.club_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION public.club_stripe_accounts_set_updated_at();

ALTER TABLE public.club_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_stripe_accounts: club admin read"
  ON public.club_stripe_accounts FOR SELECT TO authenticated
  USING (is_club_admin(club_id));

COMMENT ON TABLE public.club_stripe_accounts IS
  'Stripe Connect account link per club. Onboarding status tracked for
   enabling destination charges and payouts.';

-- 2. club_subscriptions ───────────────────────────────────────────────────────
-- Tracks each club's subscription to ClubPulse.
CREATE TYPE public.subscription_tier AS ENUM ('free', 'starter', 'pro', 'elite');
CREATE TYPE public.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
);

CREATE TABLE IF NOT EXISTS public.club_subscriptions (
  id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                 UUID                NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  tier                    subscription_tier   NOT NULL DEFAULT 'free',
  status                  subscription_status NOT NULL DEFAULT 'trialing',
  -- Stripe references
  stripe_customer_id      TEXT,                         -- cus_xxx
  stripe_subscription_id  TEXT,                         -- sub_xxx
  stripe_price_id         TEXT,                         -- price_xxx
  -- Billing
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN     NOT NULL DEFAULT FALSE,
  canceled_at             TIMESTAMPTZ,
  -- Trial
  trial_start             TIMESTAMPTZ DEFAULT NOW(),
  trial_end               TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  -- Limits by tier
  max_members             INTEGER     NOT NULL DEFAULT 25,   -- free tier default
  max_scores_per_month    INTEGER     NOT NULL DEFAULT 5000, -- free tier default
  -- Metadata
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.club_subscriptions_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER club_subscriptions_updated_at
  BEFORE UPDATE ON public.club_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.club_subscriptions_set_updated_at();

ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_subscriptions: club admin read"
  ON public.club_subscriptions FOR SELECT TO authenticated
  USING (is_club_admin(club_id));

COMMENT ON TABLE public.club_subscriptions IS
  'One subscription per club. Tracks Stripe subscription lifecycle,
   tier limits, and trial periods. Free tier = 25 members, 5k Scores/mo.';

-- 3. scores_packs (catalogue) ─────────────────────────────────────────────────
-- Predefined Scores packs clubs can buy. Priced at £1.50 per 500 Scores.
CREATE TABLE IF NOT EXISTS public.scores_packs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  scores_amount   INTEGER     NOT NULL CHECK (scores_amount > 0),
  price_pence     INTEGER     NOT NULL CHECK (price_pence > 0),  -- £ in pence
  stripe_price_id TEXT,                                          -- price_xxx for checkout
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scores_packs ENABLE ROW LEVEL SECURITY;

-- Everyone can see the catalogue
CREATE POLICY "scores_packs: public read"
  ON public.scores_packs FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Seed the default packs: £1.50 per 500 Scores
-- Small:  2,500 Scores = £7.50    (5 × 500)
-- Medium: 5,000 Scores = £15.00   (10 × 500)
-- Large:  10,000 Scores = £30.00  (20 × 500)
-- XL:     25,000 Scores = £75.00  (50 × 500)
-- Mega:   50,000 Scores = £150.00 (100 × 500)
INSERT INTO public.scores_packs (name, scores_amount, price_pence, sort_order, description) VALUES
  ('Starter Pack',   2500,   750,  1, '2,500 Scores — great for a week of rewards'),
  ('Team Pack',      5000,  1500,  2, '5,000 Scores — covers a typical training session'),
  ('Match Day',     10000,  3000,  3, '10,000 Scores — fuel a full match day'),
  ('Season Boost',  25000,  7500,  4, '25,000 Scores — half a season sorted'),
  ('Season Pass',   50000, 15000,  5, '50,000 Scores — full season supply')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.scores_packs IS
  'Catalogue of Scores packs clubs can buy. £1.50 per 500 Scores
   (face value £1). The 50% markup is ClubPulse revenue.';

-- 4. scores_pack_purchases ────────────────────────────────────────────────────
-- Append-only ledger of every Scores pack purchase.
CREATE TABLE IF NOT EXISTS public.scores_pack_purchases (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  pack_id               UUID        NOT NULL REFERENCES public.scores_packs(id),
  purchased_by          UUID        NOT NULL REFERENCES auth.users(id),
  scores_amount         INTEGER     NOT NULL,
  price_pence           INTEGER     NOT NULL,
  -- Stripe
  stripe_payment_intent TEXT,                    -- pi_xxx
  stripe_checkout_id    TEXT,                    -- cs_xxx
  payment_status        TEXT        NOT NULL DEFAULT 'pending', -- pending | succeeded | failed
  -- Where the Scores land
  credited_to_club      BOOLEAN     NOT NULL DEFAULT FALSE,
  credited_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_pack_purchases_club_idx
  ON public.scores_pack_purchases (club_id, created_at DESC);

ALTER TABLE public.scores_pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scores_pack_purchases: club admin read"
  ON public.scores_pack_purchases FOR SELECT TO authenticated
  USING (is_club_admin(club_id));

COMMENT ON TABLE public.scores_pack_purchases IS
  'Every Scores pack purchase by clubs. Payment via Stripe Connect
   destination charge. Scores credited to club pool after payment confirms.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Club Scores pool
--
-- clubs already has subscription_tier and subscription_active from
-- 20261025000001. Add a Scores pool balance column so clubs can
-- distribute purchased Scores to members.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS scores_pool_balance INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.clubs.scores_pool_balance IS
  'Purchased Scores available for this club to award to members.
   Credited on successful pack purchase, debited via award_scores().';

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: credit_scores_pack
--
-- Called by the webhook after a Scores pack checkout succeeds.
-- Atomically credits purchased Scores to the club's pool.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_scores_pack(
  p_purchase_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase  scores_pack_purchases%ROWTYPE;
BEGIN
  SELECT * INTO v_purchase
  FROM scores_pack_purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'purchase_not_found');
  END IF;

  IF v_purchase.credited_to_club THEN
    RETURN jsonb_build_object('ok', true, 'note', 'already_credited');
  END IF;

  IF v_purchase.payment_status != 'succeeded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payment_not_succeeded');
  END IF;

  -- Credit Scores to club pool
  UPDATE clubs
  SET scores_pool_balance = scores_pool_balance + v_purchase.scores_amount
  WHERE id = v_purchase.club_id;

  -- Mark as credited
  UPDATE scores_pack_purchases
  SET credited_to_club = TRUE,
      credited_at      = NOW()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'scores_credited', v_purchase.scores_amount,
    'club_id',        v_purchase.club_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_scores_pack(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_scores_pack(UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-create subscription row when a club is created (default free tier).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_create_club_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO club_subscriptions (club_id, tier, status, max_members, max_scores_per_month)
  VALUES (NEW.id, 'free', 'trialing', 25, 5000)
  ON CONFLICT (club_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_club_subscription ON public.clubs;
CREATE TRIGGER trg_auto_create_club_subscription
  AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_club_subscription();
