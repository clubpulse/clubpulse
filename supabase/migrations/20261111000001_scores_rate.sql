-- ─────────────────────────────────────────────────────────────────────────────
-- One Scores-to-pounds rate for the whole platform: 500 Scores = £1.
--
-- Before this migration the app used four different rates (50, 100, 500 and
-- 1,000 Scores per £1). The app constant is SCORES_PER_GBP in
-- src/lib/types/scores.ts; this file brings the SQL side into line.
--
--   • Scores Pay:   1 Score = 0.2p            (was 1p)
--   • Cash-out:     500 Scores = £0.80        (was 100 Scores = £0.80; 20% margin kept)
--   • Fee offset and charity defaults: 500 Scores = £1 (was 1,000)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Defaults for club-configurable rates. Rows still on the old default (1000)
--    move to 500; rows a club set to anything else are left alone.
ALTER TABLE club_fee_settings ALTER COLUMN scores_per_pound SET DEFAULT 500;
ALTER TABLE charity_settings  ALTER COLUMN scores_per_pound SET DEFAULT 500;
UPDATE club_fee_settings SET scores_per_pound = 500 WHERE scores_per_pound = 1000;
UPDATE charity_settings  SET scores_per_pound = 500 WHERE scores_per_pound = 1000;

-- 2. Scores Pay: same function as 20261104000002, with the new rate.
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
  SCORES_TO_PENCE CONSTANT NUMERIC := 0.2; -- 500 Scores = £1.00 → 1 Score = 0.2 pence
BEGIN
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

  SELECT flexi_balance INTO v_payer_balance
  FROM creds_wallet
  WHERE user_id = v_session.player_id
  FOR UPDATE;

  IF v_payer_balance IS NULL OR v_payer_balance < v_scores THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', COALESCE(v_payer_balance, 0));
  END IF;

  UPDATE creds_wallet
  SET flexi_balance = flexi_balance - v_scores,
      updated_at    = NOW()
  WHERE user_id = v_session.player_id;

  INSERT INTO merchant_wallets (club_id, scores_balance, lifetime_received)
  VALUES (p_club_id, v_net, v_net)
  ON CONFLICT (club_id) DO UPDATE
    SET scores_balance    = merchant_wallets.scores_balance + v_net,
        lifetime_received = merchant_wallets.lifetime_received + v_net,
        updated_at        = NOW();

  INSERT INTO scores_payments
    (payer_id, club_id, scores_amount, gbp_pence, fee_scores, net_scores, description, session_id)
  VALUES
    (v_session.player_id, p_club_id, v_scores, v_gbp_pence, v_fee, v_net, p_description, p_session_id)
  RETURNING id INTO v_payment_id;

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

-- 3. Cash-out: same function as 20261104000002, with the new rate.
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
  -- 500 Scores = £1 face value; ClubPulse keeps a 20% margin → 1 Score = £0.0016
  CASHOUT_RATE CONSTANT NUMERIC := 0.0016;
BEGIN
  SELECT scores_balance INTO v_balance
  FROM merchant_wallets
  WHERE club_id = p_club_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_scores_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', COALESCE(v_balance, 0));
  END IF;

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
