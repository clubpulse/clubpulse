-- Merchandise as a reward: a physical item bought with Scores and posted to the member.
-- The size and delivery address are stored on the redemption (fulfilment_data.merch) and the
-- order waits in a queue for ClubPulse staff to place with the print supplier by hand.

ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS is_merch BOOLEAN NOT NULL DEFAULT FALSE;
-- Sizes on offer. Empty = the item has no sizes (a bottle, a cap that fits all).
ALTER TABLE rewards_catalogue ADD COLUMN IF NOT EXISTS merch_sizes TEXT[] NOT NULL DEFAULT '{}';

-- Redeems a merchandise reward and records where to send it, in one transaction, so Scores are
-- never spent on an item with no delivery address. Wraps redeem_reward, which does the locking,
-- balance and stock checks.
-- Returns what redeem_reward returns, or { ok: false, error: 'not_found' | 'bad_size' }.
CREATE OR REPLACE FUNCTION redeem_merch(p_user_id UUID, p_reward_id UUID, p_delivery JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward rewards_catalogue%ROWTYPE;
  v_size   TEXT;
  v_result JSONB;
BEGIN
  IF p_user_id IS NULL OR p_reward_id IS NULL OR p_delivery IS NULL THEN
    RAISE EXCEPTION 'p_user_id, p_reward_id and p_delivery are required';
  END IF;

  SELECT * INTO v_reward FROM rewards_catalogue WHERE id = p_reward_id;
  IF NOT FOUND OR NOT v_reward.is_active OR NOT v_reward.is_merch THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  v_size := p_delivery->>'size';
  IF cardinality(v_reward.merch_sizes) > 0 AND (v_size IS NULL OR NOT (v_size = ANY (v_reward.merch_sizes))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_size');
  END IF;

  v_result := redeem_reward(p_user_id, p_reward_id);

  IF (v_result->>'ok')::BOOLEAN THEN
    UPDATE reward_redemptions
       SET fulfilment_data = fulfilment_data
           || jsonb_build_object('merch', p_delivery || jsonb_build_object('state', 'to_order'))
     WHERE id = (v_result->>'redemption_id')::UUID;
  END IF;

  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION redeem_merch(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_merch(UUID, UUID, JSONB) TO service_role;

-- Three draft items, switched off. Set the Scores cost and switch each on (is_active = TRUE)
-- once a supplier is chosen and a sample has been checked.
INSERT INTO rewards_catalogue (title, description, creds_cost, category, is_active, is_merch, merch_sizes)
SELECT v.title, v.description, v.creds_cost, 'merchandise', FALSE, TRUE, v.sizes
FROM (VALUES
  ('ClubPulse cap',              'An embroidered ClubPulse cap. One size, adjustable.',        7500,  ARRAY[]::TEXT[]),
  ('ClubPulse training T-shirt', 'A ClubPulse training T-shirt, printed to order.',            10000, ARRAY['S','M','L','XL','XXL']),
  ('ClubPulse water bottle',     'A ClubPulse water bottle for training and match days.',      5000,  ARRAY[]::TEXT[])
) AS v(title, description, creds_cost, sizes)
WHERE NOT EXISTS (SELECT 1 FROM rewards_catalogue r WHERE r.title = v.title);
