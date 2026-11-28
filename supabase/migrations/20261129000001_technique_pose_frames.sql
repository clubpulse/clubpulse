-- Owner-only 3D pose estimates from a player's own clip.
-- Repo only until it is applied on purpose. World landmarks are never shared.
-- Idempotent. Does not read video or call a pose model.

CREATE TABLE IF NOT EXISTS public.technique_pose_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analysis_results(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('bowling', 'batting')),
  hand TEXT NOT NULL CHECK (hand IN ('right', 'left')),
  key_event TEXT NOT NULL CHECK (key_event IN ('back_foot_contact', 'front_foot_contact', 'release', 'bat_ball_contact')),
  key_event_frame INTEGER NOT NULL CHECK (key_event_frame >= 0),
  times JSONB NOT NULL,
  frames JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS technique_pose_frames_user_idx
  ON public.technique_pose_frames (user_id, created_at DESC);

ALTER TABLE public.technique_pose_frames ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.technique_pose_frames FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.technique_pose_frames TO authenticated;
GRANT ALL ON public.technique_pose_frames TO service_role;

DROP POLICY IF EXISTS technique_pose_owner_select ON public.technique_pose_frames;
CREATE POLICY technique_pose_owner_select ON public.technique_pose_frames
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS technique_pose_owner_insert ON public.technique_pose_frames;
CREATE POLICY technique_pose_owner_insert ON public.technique_pose_frames
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS technique_pose_owner_delete ON public.technique_pose_frames;
CREATE POLICY technique_pose_owner_delete ON public.technique_pose_frames
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
