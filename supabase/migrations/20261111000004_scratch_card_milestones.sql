-- ─────────────────────────────────────────────────────────────────────────────
-- Free scratch card at every Scores milestone
--
-- scratch_card_config.milestone_scores has existed since 20261110000001 but
-- nothing ever issued the card. The wallet trigger from 20261111000002 now does
-- both jobs whenever lifetime_earned rises:
--   1. records earnings made outside award_scores() in the ledger
--   2. issues one free card for each milestone the player has just crossed
--      (confirmed over-18s only, at most three cards per credit)
-- It never blocks the wallet update.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_wallet_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta     INTEGER := NEW.lifetime_earned - OLD.lifetime_earned;
  v_club      UUID;
  v_milestone INTEGER;
  v_cards     INTEGER;
BEGIN
  IF v_delta <= 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT club_id INTO v_club FROM club_members
    WHERE user_id = NEW.user_id AND is_active ORDER BY joined_at LIMIT 1;

    IF COALESCE(current_setting('clubpulse.skip_ledger', TRUE), '') <> '1' THEN
      INSERT INTO scores_ledger (user_id, club_id, source, amount) VALUES (NEW.user_id, v_club, 'other', v_delta);
    END IF;

    IF v_club IS NOT NULL THEN
      SELECT milestone_scores INTO v_milestone FROM scratch_card_config WHERE club_id = v_club AND is_active;
      IF v_milestone IS NOT NULL AND v_milestone > 0 THEN
        v_cards := LEAST(3, NEW.lifetime_earned / v_milestone - OLD.lifetime_earned / v_milestone);
        IF v_cards > 0 AND is_adult_player(NEW.user_id, v_club) THEN
          INSERT INTO scratch_cards (club_id, user_id, source, scores_spent)
          SELECT v_club, NEW.user_id, 'milestone', 0 FROM generate_series(1, v_cards);
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- records and bonus cards are never a reason to fail a wallet credit
  END;

  RETURN NEW;
END;
$$;
