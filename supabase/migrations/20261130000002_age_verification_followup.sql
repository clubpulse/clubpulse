-- Follow-up for the age-verification rules. Repo only. Idempotent.
-- Squad flags are readable by DBS-checked club staff, not by the player.
-- Public cards and the club leaderboard leave out anyone without a club-confirmed date of birth
-- or a real (non-mock) third-party pass held while they have no club.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.age_squad_mismatches
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.safeguarding_incidents(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS age_squad_mismatch_read ON public.age_squad_mismatches;
CREATE POLICY age_squad_mismatch_read ON public.age_squad_mismatches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_members cm
      JOIN public.dbs_checks d ON d.user_id = cm.user_id AND d.club_id = cm.club_id
      WHERE cm.club_id = age_squad_mismatches.club_id
        AND cm.user_id = auth.uid()
        AND cm.is_active
        AND cm.role IN ('club_admin', 'coach', 'welfare_officer')
        AND d.status = 'valid'
        AND d.check_type IN ('enhanced', 'enhanced_barred')
        AND (d.expiry_date IS NULL OR d.expiry_date >= CURRENT_DATE)
    )
  );

CREATE OR REPLACE FUNCTION public.correct_date_of_birth(
  p_member UUID,
  p_club UUID,
  p_official UUID,
  p_new DATE,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  previous DATE;
BEGIN
  SELECT date_of_birth INTO previous FROM public.profiles WHERE id = p_member FOR UPDATE;
  INSERT INTO public.dob_change_log (user_id, club_id, previous_dob, new_dob, changed_by, reason)
  VALUES (p_member, p_club, previous, p_new, p_official, p_reason);
  UPDATE public.profiles SET date_of_birth = p_new WHERE id = p_member;
END;
$$;

REVOKE ALL ON FUNCTION public.correct_date_of_birth(UUID, UUID, UUID, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correct_date_of_birth(UUID, UUID, UUID, DATE, TEXT) TO service_role;

CREATE OR REPLACE VIEW public.public_profile_cards
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  (SELECT c.name FROM public.club_members cm JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.user_id = p.id AND cm.is_active ORDER BY cm.club_id LIMIT 1) AS club_name
FROM public.profiles p
WHERE p.is_active IS NOT FALSE
  AND (p.date_of_birth IS NULL OR p.date_of_birth <= (CURRENT_DATE - INTERVAL '18 years'))
  AND NOT EXISTS (SELECT 1 FROM public.club_members j WHERE j.user_id = p.id AND j.is_junior)
  AND NOT EXISTS (SELECT 1 FROM public.child_profiles k WHERE k.linked_user_id = p.id)
  AND (
    (p.dob_confirmed_by IS NOT NULL AND p.dob_confirmed_at IS NOT NULL AND p.dob_confirmation_method IS NOT NULL)
    OR (
      NOT EXISTS (SELECT 1 FROM public.club_members active_club WHERE active_club.user_id = p.id AND active_club.is_active)
      AND EXISTS (
        SELECT 1 FROM public.age_verifications av
        WHERE av.user_id = p.id AND av.status = 'passed' AND av.provider <> 'mock'
      )
    )
  );

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
  AND NOT EXISTS (SELECT 1 FROM public.club_members j WHERE j.user_id = p.id AND j.is_junior)
  AND NOT EXISTS (SELECT 1 FROM public.child_profiles k WHERE k.linked_user_id = p.id)
  AND p.dob_confirmed_by IS NOT NULL
  AND p.dob_confirmed_at IS NOT NULL
  AND p.dob_confirmation_method IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = cm.club_id AND me.user_id = auth.uid() AND me.is_active
  );

REVOKE ALL ON public.club_scores_leaderboard FROM PUBLIC, anon;
GRANT SELECT ON public.club_scores_leaderboard TO authenticated, service_role;
