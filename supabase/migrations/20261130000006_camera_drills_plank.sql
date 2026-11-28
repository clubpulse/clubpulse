-- Adds the plank hold to the camera movement checks. Repo only until applied on purpose. Idempotent.
-- Still numbers only: a time and a score, no video, no picture.

ALTER TABLE public.camera_drill_baselines DROP CONSTRAINT IF EXISTS camera_drill_baselines_drill_key_check;
ALTER TABLE public.camera_drill_baselines
  ADD CONSTRAINT camera_drill_baselines_drill_key_check CHECK (drill_key IN ('squat', 'balance', 'shoulder', 'jump', 'reach', 'plank'));

ALTER TABLE public.camera_drill_sessions DROP CONSTRAINT IF EXISTS camera_drill_sessions_drill_key_check;
ALTER TABLE public.camera_drill_sessions
  ADD CONSTRAINT camera_drill_sessions_drill_key_check CHECK (drill_key IN ('squat', 'balance', 'shoulder', 'jump', 'reach', 'plank'));
