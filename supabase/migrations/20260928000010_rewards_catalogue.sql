CREATE TABLE IF NOT EXISTS rewards_catalogue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  image_url         TEXT,
  creds_cost        INTEGER NOT NULL CHECK (creds_cost > 0),
  category          TEXT,
  merchant_id       UUID,             -- the merchant user that supplies the reward (nullable)
  awin_merchant_id  TEXT,
  deep_link         TEXT,
  stock_count       INTEGER CHECK (stock_count IS NULL OR stock_count >= 0),  -- NULL = unlimited
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rewards_catalogue_active_idx ON rewards_catalogue(is_active, creds_cost);

ALTER TABLE rewards_catalogue ENABLE ROW LEVEL SECURITY;

-- Signed-in users read active rewards. Writes: service role only (it bypasses RLS).
DROP POLICY IF EXISTS "rewards_catalogue: read active" ON rewards_catalogue;
CREATE POLICY "rewards_catalogue: read active" ON rewards_catalogue
  FOR SELECT TO authenticated USING (is_active);

-- Now that the table exists, link redemptions to it (guarded so the migration can be re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_redemptions_reward_id_fkey') THEN
    ALTER TABLE reward_redemptions
      ADD CONSTRAINT reward_redemptions_reward_id_fkey
      FOREIGN KEY (reward_id) REFERENCES rewards_catalogue(id);
  END IF;
END $$;

-- Atomic redemption: lock reward + wallet, check stock and balance, deduct (flexi first, then
-- reward balance), decrement stock, insert the redemption. One transaction, so concurrent
-- redemptions can't overspend or oversell.
-- Returns JSONB: { ok: true, redemption_id, creds_spent, balance }
--            or: { ok: false, error: 'not_found' | 'out_of_stock' | 'insufficient_creds', ... }
CREATE OR REPLACE FUNCTION redeem_reward(p_user_id UUID, p_reward_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward        rewards_catalogue%ROWTYPE;
  v_flexi         INTEGER;
  v_reward_bal    INTEGER;
  v_from_flexi    INTEGER;
  v_from_reward   INTEGER;
  v_redemption_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_reward_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id and p_reward_id are required';
  END IF;

  SELECT * INTO v_reward FROM rewards_catalogue WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND OR NOT v_reward.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_reward.stock_count IS NOT NULL AND v_reward.stock_count <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'out_of_stock');
  END IF;

  SELECT flexi_balance, reward_balance INTO v_flexi, v_reward_bal
  FROM creds_wallet WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND OR (v_flexi + v_reward_bal) < v_reward.creds_cost THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_creds',
      'balance', COALESCE(v_flexi + v_reward_bal, 0), 'cost', v_reward.creds_cost
    );
  END IF;

  v_from_flexi  := LEAST(v_flexi, v_reward.creds_cost);
  v_from_reward := v_reward.creds_cost - v_from_flexi;

  UPDATE creds_wallet
  SET flexi_balance  = flexi_balance - v_from_flexi,
      reward_balance = reward_balance - v_from_reward,
      updated_at     = NOW()
  WHERE user_id = p_user_id;

  IF v_reward.stock_count IS NOT NULL THEN
    UPDATE rewards_catalogue SET stock_count = stock_count - 1 WHERE id = p_reward_id;
  END IF;

  INSERT INTO reward_redemptions (user_id, reward_id, creds_spent, status, fulfilment_data)
  VALUES (p_user_id, p_reward_id, v_reward.creds_cost, 'pending',
          jsonb_build_object('from_flexi', v_from_flexi, 'from_reward', v_from_reward))
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'ok', true, 'redemption_id', v_redemption_id, 'creds_spent', v_reward.creds_cost,
    'balance', (v_flexi + v_reward_bal) - v_reward.creds_cost
  );
END;
$$;

-- Service role only: this moves Creds, so users must not be able to call it with any user id.
REVOKE ALL ON FUNCTION redeem_reward(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_reward(UUID, UUID) TO service_role;
