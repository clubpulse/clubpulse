-- The Academy: short lessons with a three-question check, and a personal weekly practice plan.
-- Lesson content lives in the code (src/lib/academy/content.ts); this stores each person's
-- progress and plans. Safe to run more than once.

-- 1. Scores for learning. Each lesson pays once, ever; so does finishing a track.
INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('academy_lesson', 'Academy lesson passed', 'Paid the first time a player passes a lesson check (two of three right).', 'app', 10, TRUE, 31),
  ('academy_track',  'Academy track finished', 'Bonus the first time a player passes every lesson in a track.',           'app', 30, TRUE, 32)
ON CONFLICT (source) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- 2. Progress: one row per person and lesson.
CREATE TABLE IF NOT EXISTS academy_progress (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       TEXT NOT NULL,
  best_score      INTEGER NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 3),
  passed          BOOLEAN NOT NULL DEFAULT FALSE,
  first_passed_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academy_progress: own read" ON academy_progress;
CREATE POLICY "academy_progress: own read" ON academy_progress FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3. Personal plans. The newest is the current one; older ones are kept as history.
CREATE TABLE IF NOT EXISTS academy_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus      TEXT NOT NULL,
  role       TEXT NOT NULL,
  sessions   INTEGER NOT NULL CHECK (sessions BETWEEN 2 AND 5),
  minutes    INTEGER NOT NULL CHECK (minutes IN (15, 30, 45)),
  plan       JSONB NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('ai', 'library')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS academy_plans_user_idx ON academy_plans(user_id, created_at DESC);
ALTER TABLE academy_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academy_plans: own read" ON academy_plans;
CREATE POLICY "academy_plans: own read" ON academy_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
