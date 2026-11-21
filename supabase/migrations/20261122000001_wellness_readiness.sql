-- Wellness first slice: a private same-day readiness check-in and a match-day preparation checklist.
-- Own rows only. Coaches cannot read either table; a consented aggregate comes later.

CREATE TABLE IF NOT EXISTS wellness_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  check_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  sleep INTEGER NOT NULL CHECK (sleep BETWEEN 1 AND 5),
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  soreness INTEGER NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  stress INTEGER NOT NULL CHECK (stress BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, check_date)
);

CREATE INDEX IF NOT EXISTS wellness_readiness_user_date_idx ON wellness_readiness (user_id, check_date DESC);

ALTER TABLE wellness_readiness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wellness_readiness: own only" ON wellness_readiness;
CREATE POLICY "wellness_readiness: own only" ON wellness_readiness FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wellness_checklist_ticks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  item_id TEXT NOT NULL,
  ticked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, check_date, item_id)
);

ALTER TABLE wellness_checklist_ticks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wellness_checklist_ticks: own only" ON wellness_checklist_ticks;
CREATE POLICY "wellness_checklist_ticks: own only" ON wellness_checklist_ticks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
