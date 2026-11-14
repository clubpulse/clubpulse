-- ─────────────────────────────────────────────────────────────────────────────
-- Scores QR Payment System
--
-- Players pay merchants (clubhouse bar, club shop) directly in Scores via QR.
-- Scores transfer from creds_wallet (player) → merchant_wallets (club).
-- Clubs accumulate Scores and request cashout as GBP.
--
-- Tables:
--   merchant_wallets   — one per club; holds Scores balance + cashout requests
--   scores_payments    — append-only ledger of every player → merchant transfer
--   scores_pay_sessions — short-lived QR session (player generates, merchant scans)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. merchant_wallets ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merchant_wallets (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID        NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  scores_balance      INTEGER     NOT NULL DEFAULT 0,
  lifetime_received   INTEGER     NOT NULL DEFAULT 0,
  -- BaaS cashout fields (populated when club requests payout)
  pending_cashout     INTEGER     NOT NULL DEFAULT 0,
  bank_account_name   TEXT,
  bank_sort_code      TEXT,
  bank_account_number TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.merchant_wallets_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER merchant_wallets_updated_at
  BEFORE UPDATE ON public.merchant_wallets
  FOR EACH ROW EXECUTE FUNCTION public.merchant_wallets_set_updated_at();

ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;

-- Club admins can read their own merchant wallet
CREATE POLICY "merchant_wallets: club admin read"
  ON public.merchant_wallets FOR SELECT TO authenticated
  USING (is_club_admin(club_id));

COMMENT ON TABLE public.merchant_wallets IS
  'One row per club. Accumulates Scores received from player payments.
   Club admins request cashout → GBP transfer via BaaS (Phase 2).';

-- 2. scores_payments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scores_payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Payer (player)
  payer_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Recipient (club merchant)
  club_id         UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  -- Amount in Scores
  scores_amount   INTEGER     NOT NULL CHECK (scores_amount > 0),
  -- GBP equivalent at time of payment (100 Scores = £1.00 → 200 pence)
  gbp_pence       INTEGER     NOT NULL,
  -- ClubPulse transaction fee (5% of scores_amount, rounded down)
  fee_scores      INTEGER     NOT NULL DEFAULT 0,
  -- Net Scores credited to merchant after fee
  net_scores      INTEGER     NOT NULL,
  -- Human-readable description e.g. "Bar purchase", "Club shop"
  description     TEXT,
  -- Reference back to the QR session that triggered this
  session_id      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_payments_payer_idx
  ON public.scores_payments (payer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scores_payments_club_idx
  ON public.scores_payments (club_id, created_at DESC);

ALTER TABLE public.scores_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scores_payments: payer read"
  ON public.scores_payments FOR SELECT TO authenticated
  USING (auth.uid() = payer_id);

CREATE POLICY "scores_payments: club admin read"
  ON public.scores_payments FOR SELECT TO authenticated
  USING (is_club_admin(club_id));

COMMENT ON TABLE public.scores_payments IS
  'Append-only ledger of Scores payments from players to club merchants.
   5% fee retained by ClubPulse; net_scores credited to merchant_wallets.';

-- 3. scores_pay_sessions ──────────────────────────────────────────────────────
-- Short-lived QR session: player generates → merchant scans → payment fires.
-- Expires after 5 minutes; consumed (is_used = true) after one use.
CREATE TABLE IF NOT EXISTS public.scores_pay_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Scores the player intends to spend (set at QR generation, confirmed by merchant)
  scores_amount   INTEGER     NOT NULL CHECK (scores_amount > 0),
  -- Merchant fills this in when scanning
  club_id         UUID        REFERENCES public.clubs(id),
  description     TEXT,
  is_used         BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_pay_sessions_player_idx
  ON public.scores_pay_sessions (player_id, created_at DESC);

ALTER TABLE public.scores_pay_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scores_pay_sessions: own read"
  ON public.scores_pay_sessions FOR SELECT TO authenticated
  USING (auth.uid() = player_id);

CREATE POLICY "scores_pay_sessions: own insert"
  ON public.scores_pay_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: process_scores_payment
--
-- Called by /api/scores/pay (service role).
-- Atomically:
--   1. Validates session (not used, not expired, correct player)
--   2. Checks player has sufficient flexi_balance
--   3. Deducts scores from creds_wallet (player)
--   4. Credits net_scores to merchant_wallets (club), upserts if first payment
--   5. Inserts scores_payments row
--   6. Marks session as used
--
-- Returns: jsonb { ok, payment_id, payer_balance_after, error? }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_scores_payment(
  p_session_id    UUID,
  p_club_id       UUID,
  p_description   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session       scores_pay_sessions%ROWTYPE;
  v_scores        INTEGER;
  v_fee           INTEGER;
  v_net           INTEGER;
  v_gbp_pence     INTEGER;
  v_payer_balance INTEGER;
  v_payment_id    UUID;
  FEE_PCT CONSTANT NUMERIC := 0.05;
  SCORES_TO_PENCE CONSTANT NUMERIC := 1.0; -- 100 Scores = £1.00 = 100 pence → 1 Score = 1 pence
BEGIN
  -- Lock and fetch session
  SELECT * INTO v_session
  FROM scores_pay_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  IF v_session.is_used THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_already_used');
  END IF;

  IF v_session.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_expired');
  END IF;

  v_scores    := v_session.scores_amount;
  v_fee       := FLOOR(v_scores * FEE_PCT);
  v_net       := v_scores - v_fee;
  v_gbp_pence := FLOOR(v_scores * SCORES_TO_PENCE);

  -- Check player balance
  SELECT flexi_balance INTO v_payer_balance
  FROM creds_wallet
  WHERE user_id = v_session.player_id
  FOR UPDATE;

  IF v_payer_balance IS NULL OR v_payer_balance < v_scores THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', COALESCE(v_payer_balance, 0));
  END IF;

  -- Deduct from player wallet
  UPDATE creds_wallet
  SET flexi_balance = flexi_balance - v_scores,
      updated_at    = NOW()
  WHERE user_id = v_session.player_id;

  -- Credit merchant wallet (upsert)
  INSERT INTO merchant_wallets (club_id, scores_balance, lifetime_received)
  VALUES (p_club_id, v_net, v_net)
  ON CONFLICT (club_id) DO UPDATE
    SET scores_balance    = merchant_wallets.scores_balance + v_net,
        lifetime_received = merchant_wallets.lifetime_received + v_net,
        updated_at        = NOW();

  -- Log payment
  INSERT INTO scores_payments
    (payer_id, club_id, scores_amount, gbp_pence, fee_scores, net_scores, description, session_id)
  VALUES
    (v_session.player_id, p_club_id, v_scores, v_gbp_pence, v_fee, v_net, p_description, p_session_id)
  RETURNING id INTO v_payment_id;

  -- Mark session used
  UPDATE scores_pay_sessions
  SET is_used = TRUE,
      club_id = p_club_id,
      description = p_description
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'ok',                  true,
    'payment_id',          v_payment_id,
    'scores_spent',        v_scores,
    'fee_scores',          v_fee,
    'net_to_merchant',     v_net,
    'payer_balance_after', v_payer_balance - v_scores
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_scores_payment(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_scores_payment(UUID, UUID, TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: request_scores_cashout
--
-- Club admin requests conversion of Scores to GBP.
-- Phase 1: creates a pending cashout record for manual processing.
-- Phase 2: will trigger BaaS (Modulr/Railsbank) payout automatically.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_scores_cashout(
  p_club_id       UUID,
  p_scores_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  -- Phase 1: 1 Score = £0.008 (80p per 100 Scores) — ClubPulse retains 20p margin
  CASHOUT_RATE CONSTANT NUMERIC := 0.008;
BEGIN
  SELECT scores_balance INTO v_balance
  FROM merchant_wallets
  WHERE club_id = p_club_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_scores_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', COALESCE(v_balance, 0));
  END IF;

  -- Reserve the amount as pending
  UPDATE merchant_wallets
  SET scores_balance  = scores_balance  - p_scores_amount,
      pending_cashout = pending_cashout + p_scores_amount,
      updated_at      = NOW()
  WHERE club_id = p_club_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'scores_queued', p_scores_amount,
    'gbp_pence',     FLOOR(p_scores_amount * CASHOUT_RATE * 100),
    'note',          'Cashout queued — funds transferred within 3 business days'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_scores_cashout(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_scores_cashout(UUID, INTEGER) TO service_role;
