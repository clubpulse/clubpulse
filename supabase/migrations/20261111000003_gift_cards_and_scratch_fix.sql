-- ─────────────────────────────────────────────────────────────────────────────
-- Gift card and scratch card fixes
--
--   1. Voucher columns on reward_redemptions. 20261104000003 tried to add them to
--      a table called "redemptions", which does not exist, so issued vouchers
--      were never stored. Safe to run whether or not that file was applied.
--   2. Fulfilment columns on scratch_cards, so a gift card won on a scratch card
--      can be issued and shown to the player.
--   3. reveal_scratch_card: correct weighted draw, and gift card prizes are
--      marked pending for fulfilment.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. reward_redemptions ───────────────────────────────────────────────────────
ALTER TABLE public.reward_redemptions DROP CONSTRAINT IF EXISTS reward_redemptions_status_check;
ALTER TABLE public.reward_redemptions ADD CONSTRAINT reward_redemptions_status_check
  CHECK (status IN ('pending', 'fulfilled', 'cancelled', 'refunded', 'tango_pending', 'failed'));
ALTER TABLE public.reward_redemptions
  ADD COLUMN IF NOT EXISTS tango_reference      TEXT,
  ADD COLUMN IF NOT EXISTS voucher_token        TEXT,
  ADD COLUMN IF NOT EXISTS voucher_instructions TEXT,
  ADD COLUMN IF NOT EXISTS voucher_expiry       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes                TEXT;

-- 2. scratch_cards fulfilment ─────────────────────────────────────────────────
ALTER TABLE scratch_cards
  ADD COLUMN IF NOT EXISTS fulfilment_status    TEXT NOT NULL DEFAULT 'none'
    CHECK (fulfilment_status IN ('none', 'pending', 'fulfilled', 'failed')),
  ADD COLUMN IF NOT EXISTS provider_reference   TEXT,
  ADD COLUMN IF NOT EXISTS voucher_token        TEXT,
  ADD COLUMN IF NOT EXISTS voucher_instructions TEXT,
  ADD COLUMN IF NOT EXISTS voucher_expiry       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilment_notes     TEXT;

CREATE INDEX IF NOT EXISTS scratch_cards_fulfilment_idx
  ON scratch_cards(fulfilment_status) WHERE fulfilment_status IN ('pending', 'failed');

-- 3. reveal_scratch_card ──────────────────────────────────────────────────────
-- The previous draw ordered by random() * weight, which over-picks heavy prizes
-- (a 30-vs-10 pair came out 83/17 instead of 75/25). Ordering by
-- -ln(u) / weight gives each prize exactly weight / sum(weights).
CREATE OR REPLACE FUNCTION reveal_scratch_card(p_user_id UUID, p_card_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card        scratch_cards%ROWTYPE;
  v_prize       scratch_card_prizes%ROWTYPE;
  v_prize_json  JSONB;
  v_week_start  TIMESTAMPTZ := date_trunc('week', NOW());
BEGIN
  SELECT * INTO v_card
  FROM scratch_cards
  WHERE id = p_card_id AND user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_card.status = 'scratched' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_scratched');
  END IF;

  SELECT p.* INTO v_prize
  FROM scratch_card_prizes p
  WHERE p.club_id = v_card.club_id
    AND p.is_active
    AND (
      p.weekly_cap IS NULL
      OR (
        SELECT COUNT(*) FROM scratch_cards sc
        WHERE sc.club_id = v_card.club_id
          AND sc.prize_id = p.id
          AND sc.scratched_at >= v_week_start
      ) < p.weekly_cap
    )
  ORDER BY -ln(1.0 - random()) / p.weight
  LIMIT 1;

  IF NOT FOUND THEN
    v_prize_json := jsonb_build_object('type', 'try_again', 'label', 'Better luck next time!');
    UPDATE scratch_cards
    SET status = 'scratched', prize_snapshot = v_prize_json, scratched_at = NOW()
    WHERE id = p_card_id;
    RETURN jsonb_build_object('ok', true, 'prize', v_prize_json);
  END IF;

  v_prize_json := jsonb_build_object(
    'type',           v_prize.prize_type,
    'label',          v_prize.label,
    'scores_amount',  v_prize.scores_amount,
    'reward_id',      v_prize.reward_id,
    'club_reward',    v_prize.club_reward_desc
  );

  IF v_prize.prize_type = 'scores' AND v_prize.scores_amount IS NOT NULL THEN
    UPDATE creds_wallet
    SET reward_balance = reward_balance + v_prize.scores_amount,
        updated_at     = NOW()
    WHERE user_id = p_user_id;
  END IF;

  UPDATE scratch_cards
  SET status            = 'scratched',
      prize_id          = v_prize.id,
      prize_snapshot    = v_prize_json,
      scratched_at      = NOW(),
      fulfilment_status = CASE WHEN v_prize.prize_type IN ('gift_card', 'club_reward') THEN 'pending' ELSE 'none' END
  WHERE id = p_card_id;

  RETURN jsonb_build_object('ok', true, 'prize', v_prize_json);
END;
$$;

REVOKE ALL ON FUNCTION reveal_scratch_card(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reveal_scratch_card(UUID, UUID) TO service_role;
