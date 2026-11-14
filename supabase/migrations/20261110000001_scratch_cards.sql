-- ─────────────────────────────────────────────────────────────────────────────
-- Scratch Cards
--
-- Players spend Scores to reveal a mystery prize from a weighted prize pool.
-- Clubs configure the prize pool via scratch_card_prizes; issued cards live in
-- scratch_cards; each reveal atomically deducts Scores and credits the prize.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Prize pool configuration (per club) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS scratch_card_prizes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,                      -- e.g. "200 Scores", "£5 Amazon"
  prize_type       TEXT NOT NULL CHECK (prize_type IN (
                     'scores',       -- credits Scores to wallet
                     'gift_card',    -- triggers Runa gift card issuance
                     'club_reward',  -- club-funded (match fee, kit discount, free fantasy)
                     'try_again'     -- filler — no prize
                   )),
  scores_amount    INTEGER,          -- for prize_type = 'scores'
  reward_id        UUID REFERENCES rewards_catalogue(id), -- for prize_type = 'gift_card'
  club_reward_desc TEXT,             -- for prize_type = 'club_reward' e.g. "Free match fee"
  weight           INTEGER NOT NULL DEFAULT 10 CHECK (weight > 0), -- relative probability
  weekly_cap       INTEGER,          -- max times this prize can be won per club per week (NULL = unlimited)
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scratch_card_prizes_club_idx
  ON scratch_card_prizes(club_id, is_active);

-- 2. Scratch card configuration (per club) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS scratch_card_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE UNIQUE,
  cost_scores      INTEGER NOT NULL DEFAULT 500 CHECK (cost_scores > 0),  -- Scores to buy one card
  milestone_scores INTEGER,          -- if set, award a free card every N cumulative Scores earned
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Issued scratch cards ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scratch_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source           TEXT NOT NULL CHECK (source IN (
                     'purchased',    -- player spent Scores
                     'milestone',    -- auto-awarded on Scores milestone
                     'bonus',        -- coach / admin awarded
                     'event'         -- special event
                   )),
  scores_spent     INTEGER NOT NULL DEFAULT 0,  -- 0 if free (milestone/bonus)
  status           TEXT NOT NULL DEFAULT 'unscratched' CHECK (status IN ('unscratched', 'scratched')),
  prize_id         UUID REFERENCES scratch_card_prizes(id),  -- set on reveal
  prize_snapshot   JSONB,            -- copy of prize at reveal time (label, type, amount etc.)
  scratched_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scratch_cards_user_idx  ON scratch_cards(user_id, status);
CREATE INDEX IF NOT EXISTS scratch_cards_club_idx  ON scratch_cards(club_id, created_at DESC);

-- 4. RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE scratch_card_prizes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_card_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_cards        ENABLE ROW LEVEL SECURITY;

-- Players read active prizes for their own club (via membership)
CREATE POLICY "scratch_card_prizes: member read"
  ON scratch_card_prizes FOR SELECT TO authenticated
  USING (
    is_active AND
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = scratch_card_prizes.club_id
        AND club_members.user_id = auth.uid()
    )
  );

-- Players read their own cards
CREATE POLICY "scratch_cards: own read"
  ON scratch_cards FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Players read config for their club
CREATE POLICY "scratch_card_config: member read"
  ON scratch_card_config FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = scratch_card_config.club_id
        AND club_members.user_id = auth.uid()
    )
  );

-- 5. Atomic scratch card purchase ─────────────────────────────────────────────
-- Deducts Scores from wallet and issues an unscratched card in one transaction.
-- Returns JSONB: { ok: true, card_id } or { ok: false, error: '...' }
CREATE OR REPLACE FUNCTION buy_scratch_card(p_user_id UUID, p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config    scratch_card_config%ROWTYPE;
  v_flexi     INTEGER;
  v_reward    INTEGER;
  v_cost      INTEGER;
  v_card_id   UUID;
BEGIN
  SELECT * INTO v_config
  FROM scratch_card_config
  WHERE club_id = p_club_id AND is_active;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'scratch_cards_not_enabled');
  END IF;

  v_cost := v_config.cost_scores;

  SELECT flexi_balance, reward_balance INTO v_flexi, v_reward
  FROM creds_wallet WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND OR (v_flexi + v_reward) < v_cost THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_scores',
      'balance', COALESCE(v_flexi + v_reward, 0), 'cost', v_cost
    );
  END IF;

  -- Deduct flexi first, then reward balance
  DECLARE
    v_from_flexi  INTEGER := LEAST(v_flexi, v_cost);
    v_from_reward INTEGER := v_cost - v_from_flexi;
  BEGIN
    UPDATE creds_wallet
    SET flexi_balance  = flexi_balance  - v_from_flexi,
        reward_balance = reward_balance - v_from_reward,
        updated_at     = NOW()
    WHERE user_id = p_user_id;
  END;

  INSERT INTO scratch_cards (club_id, user_id, source, scores_spent)
  VALUES (p_club_id, p_user_id, 'purchased', v_cost)
  RETURNING id INTO v_card_id;

  RETURN jsonb_build_object('ok', true, 'card_id', v_card_id, 'cost', v_cost);
END;
$$;

REVOKE ALL ON FUNCTION buy_scratch_card(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION buy_scratch_card(UUID, UUID) TO service_role;

-- 6. Atomic scratch reveal ────────────────────────────────────────────────────
-- Picks a weighted random prize (respecting weekly caps), marks card scratched,
-- credits Scores prizes immediately. Gift card and club rewards fulfilled async.
-- Returns JSONB: { ok: true, prize: { type, label, scores_amount?, reward_id? } }
--            or: { ok: false, error: '...' }
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

  -- Pick a weighted random prize respecting weekly caps
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
  ORDER BY random() * p.weight DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback: no prizes available (all capped) — award try_again
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

  -- Credit Scores immediately for scores prizes
  IF v_prize.prize_type = 'scores' AND v_prize.scores_amount IS NOT NULL THEN
    UPDATE creds_wallet
    SET reward_balance = reward_balance + v_prize.scores_amount,
        updated_at     = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Mark card scratched
  UPDATE scratch_cards
  SET status         = 'scratched',
      prize_id       = v_prize.id,
      prize_snapshot = v_prize_json,
      scratched_at   = NOW()
  WHERE id = p_card_id;

  RETURN jsonb_build_object('ok', true, 'prize', v_prize_json);
END;
$$;

REVOKE ALL ON FUNCTION reveal_scratch_card(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reveal_scratch_card(UUID, UUID) TO service_role;

-- 7. Award a free scratch card (milestone / bonus / event) ───────────────────
CREATE OR REPLACE FUNCTION award_scratch_card(
  p_user_id UUID,
  p_club_id UUID,
  p_source  TEXT DEFAULT 'bonus'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  INSERT INTO scratch_cards (club_id, user_id, source, scores_spent)
  VALUES (p_club_id, p_user_id, p_source, 0)
  RETURNING id INTO v_card_id;

  RETURN jsonb_build_object('ok', true, 'card_id', v_card_id);
END;
$$;

REVOKE ALL ON FUNCTION award_scratch_card(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION award_scratch_card(UUID, UUID, TEXT) TO service_role;
