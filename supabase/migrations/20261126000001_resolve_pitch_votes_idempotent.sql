-- Stop resolve_pitch_votes paying winners again on a repeat call.
--
-- 20261125000001 credits creds_wallet from every pitch_votes row for the fixture with
-- is_correct = TRUE and creds_awarded = 75. That includes winners settled by an earlier
-- call, so a double-submit or a club admin running it again adds another 75 Scores to
-- each of them. The vote update itself is already limited to is_correct IS NULL; the
-- wallet update was not.
--
-- Apply this after 20261125000001. Do not re-apply that file afterwards: its
-- CREATE OR REPLACE puts the double-paying function back. Re-running this file is safe.
-- The club-admin check and the execute grants are unchanged.

CREATE OR REPLACE FUNCTION public.resolve_pitch_votes(p_fixture_id UUID, p_actual_condition TEXT, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture_club UUID;
  v_creds_reward INTEGER := 75;
  v_correct_count INTEGER;
  v_inserted INTEGER;
BEGIN
  -- Lock the fixture so two resolves cannot both pass the insert below.
  SELECT club_id INTO v_fixture_club FROM fixtures WHERE id = p_fixture_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fixture_not_found');
  END IF;

  IF NOT public.is_club_admin(v_fixture_club) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  -- One result row per fixture. A conflict means this pitch was already settled.
  INSERT INTO pitch_results (fixture_id, club_id, actual_condition, notes, recorded_by)
  VALUES (p_fixture_id, v_fixture_club, p_actual_condition, p_notes, auth.uid())
  ON CONFLICT (fixture_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_resolved');
  END IF;

  -- Credit only the votes this statement just settled. Joining pitch_votes again would
  -- match every past winner, because their creds_awarded stays 75.
  WITH settled AS (
    UPDATE pitch_votes
    SET is_correct = (prediction = p_actual_condition),
        creds_awarded = CASE WHEN prediction = p_actual_condition THEN v_creds_reward ELSE 0 END
    WHERE fixture_id = p_fixture_id AND is_correct IS NULL
    RETURNING user_id, is_correct
  )
  UPDATE creds_wallet cw
  SET flexi_balance = flexi_balance + v_creds_reward, updated_at = NOW()
  FROM settled s
  WHERE s.is_correct IS TRUE AND cw.user_id = s.user_id;

  SELECT COUNT(*) INTO v_correct_count FROM pitch_votes WHERE fixture_id = p_fixture_id AND is_correct IS TRUE;

  RETURN jsonb_build_object('ok', true, 'correct_count', v_correct_count, 'creds_per_winner', v_creds_reward);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_pitch_votes(p_fixture_id uuid, p_actual_condition text, p_notes text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_pitch_votes(p_fixture_id uuid, p_actual_condition text, p_notes text) TO authenticated, service_role;
