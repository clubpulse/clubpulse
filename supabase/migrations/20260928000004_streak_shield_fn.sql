-- Atomic streak shield: balance check, deduct and steps_log upsert in one transaction.
-- Returns JSONB: { ok: true, cost, streak_protected, balance }
--            or: { ok: false, error: 'insufficient_creds' | 'already_protected' | 'steps_already_logged' | 'no_active_streak', ... }
-- Dates are UTC, matching the API route. The cost (20) must match STREAK_SHIELD_COST in src/lib/types/sport.ts.

CREATE OR REPLACE FUNCTION use_streak_shield(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_cost             CONSTANT INTEGER := 20;
  v_today            DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_balance          INTEGER;
  v_today_steps      INTEGER;
  v_today_protected  BOOLEAN;
  v_prev_streak      INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Lock the wallet row first. Every shield request for this user queues here,
  -- so the checks below can't race with another shield request.
  SELECT flexi_balance INTO v_balance
  FROM creds_wallet
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_balance < c_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_creds', 'balance', COALESCE(v_balance, 0), 'cost', c_cost);
  END IF;

  -- Today's row: already shielded, or real steps already logged (nothing to protect)
  SELECT step_count, streak_protected INTO v_today_steps, v_today_protected
  FROM steps_log
  WHERE user_id = p_user_id AND log_date = v_today
  FOR UPDATE;

  IF FOUND THEN
    IF v_today_protected THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_protected');
    END IF;
    IF v_today_steps > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'steps_already_logged');
    END IF;
  END IF;

  -- Yesterday's streak is what we're protecting
  SELECT streak_day INTO v_prev_streak
  FROM steps_log
  WHERE user_id = p_user_id AND log_date = v_today - 1;

  IF COALESCE(v_prev_streak, 0) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_active_streak');
  END IF;

  -- Deduct and mark today as shield-protected (streak continues)
  UPDATE creds_wallet
  SET flexi_balance = flexi_balance - c_cost,
      updated_at    = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO steps_log (user_id, log_date, step_count, creds_earned, streak_day, streak_protected, source, synced_at)
  VALUES (p_user_id, v_today, 0, 0, v_prev_streak + 1, TRUE, 'apple_health', NOW())
  ON CONFLICT (user_id, log_date) DO UPDATE
  SET streak_day       = EXCLUDED.streak_day,
      streak_protected = TRUE,
      synced_at        = NOW();

  RETURN jsonb_build_object('ok', true, 'cost', c_cost, 'streak_protected', v_prev_streak + 1, 'balance', v_balance - c_cost);
END;
$$;

-- Service role only: this moves Creds, so users must not be able to call it directly with any user id.
REVOKE ALL ON FUNCTION use_streak_shield(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION use_streak_shield(UUID) TO service_role;
