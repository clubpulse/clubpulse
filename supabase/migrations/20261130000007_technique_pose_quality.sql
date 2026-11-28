-- Per-frame quality for the 3D technique estimate: which frames the model measured, which it was unsure of, and which
-- were filled in between. Coverage is the share of the action the model saw. Filled frames do not count towards it.
-- Additive and nullable, so rows saved before this keep working. Not applied anywhere by this file being merged.
ALTER TABLE public.technique_pose_frames
  ADD COLUMN IF NOT EXISTS quality text,
  ADD COLUMN IF NOT EXISTS coverage numeric CHECK (coverage IS NULL OR (coverage >= 0 AND coverage <= 1)),
  ADD COLUMN IF NOT EXISTS source_fps numeric CHECK (source_fps IS NULL OR (source_fps >= 1 AND source_fps <= 960));
