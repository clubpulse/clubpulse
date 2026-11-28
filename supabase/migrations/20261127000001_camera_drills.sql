-- Camera movement checks. Numbers only: no video, no picture, no landmark dump.
-- Repo only until it is applied on purpose. The feature stays off in the app until its flag is set.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.camera_drill_baselines (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_key TEXT NOT NULL CHECK (drill_key IN ('squat', 'balance', 'shoulder', 'jump', 'reach')),
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, drill_key)
);

CREATE TABLE IF NOT EXISTS public.camera_drill_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_key TEXT NOT NULL CHECK (drill_key IN ('squat', 'balance', 'shoulder', 'jump', 'reach')),
  day DATE NOT NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, drill_key, day)
);

CREATE TABLE IF NOT EXISTS public.camera_drill_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'either' CHECK (role IN ('batter', 'bowler', 'either')),
  skipped_at TIMESTAMPTZ
);

ALTER TABLE public.camera_drill_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_drill_prefs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.camera_drill_baselines FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.camera_drill_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.camera_drill_prefs FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.camera_drill_baselines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.camera_drill_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.camera_drill_prefs TO authenticated;
GRANT ALL ON public.camera_drill_baselines TO service_role;
GRANT ALL ON public.camera_drill_sessions TO service_role;
GRANT ALL ON public.camera_drill_prefs TO service_role;

DROP POLICY IF EXISTS camera_drill_baselines_owner ON public.camera_drill_baselines;
CREATE POLICY camera_drill_baselines_owner ON public.camera_drill_baselines
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS camera_drill_baselines_coach ON public.camera_drill_baselines;
CREATE POLICY camera_drill_baselines_coach ON public.camera_drill_baselines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coaching_bookings b
    WHERE b.coach_user_id = auth.uid()
      AND b.player_user_id = camera_drill_baselines.user_id
      AND b.status IN ('confirmed', 'completed')
  ));

DROP POLICY IF EXISTS camera_drill_sessions_owner ON public.camera_drill_sessions;
CREATE POLICY camera_drill_sessions_owner ON public.camera_drill_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS camera_drill_sessions_coach ON public.camera_drill_sessions;
CREATE POLICY camera_drill_sessions_coach ON public.camera_drill_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coaching_bookings b
    WHERE b.coach_user_id = auth.uid()
      AND b.player_user_id = camera_drill_sessions.user_id
      AND b.status IN ('confirmed', 'completed')
  ));

DROP POLICY IF EXISTS camera_drill_prefs_owner ON public.camera_drill_prefs;
CREATE POLICY camera_drill_prefs_owner ON public.camera_drill_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
