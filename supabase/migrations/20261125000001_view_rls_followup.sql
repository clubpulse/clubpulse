-- Follow-up to 20261124000001, which is not applied to production yet. Idempotent: view options,
-- CREATE OR REPLACE, revoke and grant can all run again. Apply this file after 20261124000001.
-- Do not re-apply 20261124000001 afterwards: it would turn the two owner views back into invoker views
-- and hand refresh_nemesis_pairs to every signed-in user again.
--
-- public_profile_cards and club_scores_leaderboard stay security_invoker = false (they run as the owner)
-- on purpose. profiles SELECT is own-row only, club_members SELECT is own-row (every row only for a
-- club admin), and creds_wallet SELECT is own-row. An invoker view would show each signed-in player
-- only themselves, which is what community cards and the Scores leaderboard must not do. A SELECT
-- policy on profiles wide enough to feed the views would also expose email, phone and date of birth,
-- so the narrow view is the safe surface. Juniors stay out: under 18, a junior membership, or a linked
-- child record. The leaderboard is also limited to active adults in a club the caller belongs to, so
-- one signed-in user cannot read another club's balances. Anon and PUBLIC have no SELECT.
--
-- finance_club_summary, ground_pitch_history, mood_performance_correlation and active_consents stay
-- security_invoker. Their base-table policies already return only the caller's clubs (finance entries,
-- pitch results), the caller's own moods unless they are a club admin or coach of that fixture, and
-- consent rows only for the parent or a club admin of that child. Running those as the owner would
-- show every club's money, every player's mood and every child's consent to any signed-in user.
-- Anon still has no SELECT on the views.

ALTER VIEW public.public_profile_cards SET (security_invoker = false, security_barrier = true);
COMMENT ON VIEW public.public_profile_cards IS
  'Adult cards only (id, display_name, avatar_url, club_name). Runs as the owner because profiles RLS is own-row. No SELECT for anon.';

REVOKE ALL ON public.public_profile_cards FROM PUBLIC, anon;
GRANT SELECT ON public.public_profile_cards TO authenticated, service_role;

CREATE OR REPLACE VIEW public.club_scores_leaderboard
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  cm.club_id,
  cm.user_id,
  p.full_name,
  p.avatar_url,
  COALESCE(cw.flexi_balance, 0) + COALESCE(cw.reward_balance, 0) AS total_scores,
  COALESCE(cw.flexi_balance, 0) AS flexi_balance,
  ROW_NUMBER() OVER (
    PARTITION BY cm.club_id
    ORDER BY (COALESCE(cw.flexi_balance, 0) + COALESCE(cw.reward_balance, 0)) DESC
  ) AS rank
FROM public.club_members cm
JOIN public.profiles p ON p.id = cm.user_id
LEFT JOIN public.creds_wallet cw ON cw.user_id = cm.user_id
WHERE cm.club_id IS NOT NULL
  AND cm.is_active
  AND COALESCE(cm.is_junior, FALSE) = FALSE
  AND COALESCE(p.is_active, TRUE)
  AND (p.date_of_birth IS NULL OR p.date_of_birth <= (CURRENT_DATE - INTERVAL '18 years'))
  AND NOT EXISTS (
    SELECT 1 FROM public.club_members j
    WHERE j.user_id = p.id AND j.is_junior
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.child_profiles k
    WHERE k.linked_user_id = p.id
  )
  AND EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = cm.club_id
      AND me.user_id = auth.uid()
      AND me.is_active
  );

COMMENT ON VIEW public.club_scores_leaderboard IS
  'Active adult club-mates of the caller only. Runs as the owner because profiles, club_members and creds_wallet RLS are own-row. No SELECT for anon.';

REVOKE ALL ON public.club_scores_leaderboard FROM PUBLIC, anon;
GRANT SELECT ON public.club_scores_leaderboard TO authenticated, service_role;

ALTER VIEW public.finance_club_summary SET (security_invoker = true);
ALTER VIEW public.ground_pitch_history SET (security_invoker = true);
ALTER VIEW public.mood_performance_correlation SET (security_invoker = true);
ALTER VIEW public.active_consents SET (security_invoker = true);

REVOKE ALL ON public.finance_club_summary FROM PUBLIC, anon;
GRANT SELECT ON public.finance_club_summary TO authenticated, service_role;
REVOKE ALL ON public.ground_pitch_history FROM PUBLIC, anon;
GRANT SELECT ON public.ground_pitch_history TO authenticated, service_role;
REVOKE ALL ON public.mood_performance_correlation FROM PUBLIC, anon;
GRANT SELECT ON public.mood_performance_correlation TO authenticated, service_role;
REVOKE ALL ON public.active_consents FROM PUBLIC, anon;
GRANT SELECT ON public.active_consents TO authenticated, service_role;

-- draw_raffle, seed_infamy_categories and resolve_pitch_votes are club-admin actions.
-- The admin pages already require is_club_admin (role club_admin, active). A coach is not a club admin.
-- Signed-in users keep EXECUTE so those pages can call them with the session; anyone else gets an error.
-- refresh_nemesis_pairs rewrites every pair from every match. The only app caller is logPerformance,
-- which uses the service role. Signed-in users cannot call it.

CREATE OR REPLACE FUNCTION public.draw_raffle(p_raffle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle raffles%ROWTYPE;
  v_winner_ticket raffle_tickets%ROWTYPE;
  i INTEGER;
  v_winners JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO v_raffle FROM raffles WHERE id = p_raffle_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'raffle_not_active');
  END IF;
  IF NOT public.is_club_admin(v_raffle.club_id) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;
  IF v_raffle.status != 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'raffle_not_active');
  END IF;
  FOR i IN 1..v_raffle.winner_count LOOP
    SELECT rt.* INTO v_winner_ticket
    FROM raffle_tickets rt
    WHERE rt.raffle_id = p_raffle_id AND rt.is_winner = FALSE
      AND NOT EXISTS (SELECT 1 FROM raffle_winners rw WHERE rw.ticket_id = rt.id)
    ORDER BY random()
    LIMIT 1;
    IF FOUND THEN
      INSERT INTO raffle_winners (raffle_id, user_id, ticket_id, prize_rank)
      VALUES (p_raffle_id, v_winner_ticket.user_id, v_winner_ticket.id, i);
      UPDATE raffle_tickets SET is_winner = TRUE WHERE id = v_winner_ticket.id;
      v_winners := v_winners || jsonb_build_object('rank', i, 'ticket_number', v_winner_ticket.ticket_number, 'user_id', v_winner_ticket.user_id);
    END IF;
  END LOOP;
  UPDATE raffles SET status = 'drawn', drawn_at = NOW() WHERE id = p_raffle_id;
  RETURN jsonb_build_object('ok', true, 'winners', v_winners);
END;
$$;

REVOKE ALL ON FUNCTION public.draw_raffle(p_raffle_id uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_raffle(p_raffle_id uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_infamy_categories(p_club_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_club_admin(p_club_id) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  INSERT INTO infamy_categories (club_id, name, description, emoji, created_by) VALUES
    (p_club_id, 'The Butterfingers Award', 'Most catches dropped in a season', '🧈', auth.uid()),
    (p_club_id, 'Golden Duck King', 'Most golden ducks (out for 0 off first ball)', '🦆', auth.uid()),
    (p_club_id, 'Wide Ball Wizard', 'Most wides bowled in a season', '🪄', auth.uid()),
    (p_club_id, 'The Runout King', 'Most run-outs caused (own team)', '💀', auth.uid()),
    (p_club_id, 'Last Man Standing', 'Always the one holding everyone up after the game', '⏰', auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_infamy_categories(p_club_id uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_infamy_categories(p_club_id uuid) TO authenticated, service_role;

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
BEGIN
  SELECT club_id INTO v_fixture_club FROM fixtures WHERE id = p_fixture_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fixture_not_found');
  END IF;

  IF NOT public.is_club_admin(v_fixture_club) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  INSERT INTO pitch_results (fixture_id, club_id, actual_condition, notes, recorded_by)
  VALUES (p_fixture_id, v_fixture_club, p_actual_condition, p_notes, auth.uid())
  ON CONFLICT (fixture_id) DO UPDATE SET actual_condition = p_actual_condition, notes = p_notes, recorded_at = NOW();

  UPDATE pitch_votes
  SET is_correct = (prediction = p_actual_condition),
      creds_awarded = CASE WHEN prediction = p_actual_condition THEN v_creds_reward ELSE 0 END
  WHERE fixture_id = p_fixture_id AND is_correct IS NULL;

  UPDATE creds_wallet cw
  SET flexi_balance = flexi_balance + v_creds_reward, updated_at = NOW()
  FROM pitch_votes pv
  WHERE pv.fixture_id = p_fixture_id AND pv.is_correct = TRUE AND pv.creds_awarded = v_creds_reward AND cw.user_id = pv.user_id;

  SELECT COUNT(*) INTO v_correct_count FROM pitch_votes WHERE fixture_id = p_fixture_id AND is_correct = TRUE;

  RETURN jsonb_build_object('ok', true, 'correct_count', v_correct_count, 'creds_per_winner', v_creds_reward);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_pitch_votes(p_fixture_id uuid, p_actual_condition text, p_notes text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_pitch_votes(p_fixture_id uuid, p_actual_condition text, p_notes text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.refresh_nemesis_pairs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_nemesis_pairs() TO service_role;
