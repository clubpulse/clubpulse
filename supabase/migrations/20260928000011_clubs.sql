-- Not in the original spec but required: volunteer check-in compares the volunteer's GPS with the
-- club ground, and club_id on user_roles / club_members / volunteer_sessions needs something to
-- point at. Safe to run if a clubs table already exists: it only adds the columns we read.
CREATE TABLE IF NOT EXISTS clubs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sport      TEXT NOT NULL DEFAULT 'cricket';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS ground_lat DOUBLE PRECISION;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS ground_lng DOUBLE PRECISION;

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs: read by authenticated" ON clubs;
CREATE POLICY "clubs: read by authenticated" ON clubs FOR SELECT TO authenticated USING (TRUE);
