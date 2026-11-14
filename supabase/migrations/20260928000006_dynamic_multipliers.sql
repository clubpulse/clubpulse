CREATE TABLE IF NOT EXISTS dynamic_multipliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID,                                  -- NULL = platform-wide
  name            TEXT NOT NULL,
  multiplier      DECIMAL(4,2) NOT NULL CHECK (multiplier > 0 AND multiplier <= 10),
  condition_type  TEXT NOT NULL CHECK (condition_type IN ('weather','scarcity','season_phase','manual')),
  condition_data  JSONB NOT NULL DEFAULT '{}',
  active_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_until    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (active_until IS NULL OR active_until > active_from)
);

CREATE INDEX IF NOT EXISTS dynamic_multipliers_club_idx ON dynamic_multipliers(club_id);
CREATE INDEX IF NOT EXISTS dynamic_multipliers_window_idx ON dynamic_multipliers(active_from, active_until);

ALTER TABLE dynamic_multipliers ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can see multipliers that are currently active
DROP POLICY IF EXISTS "dynamic_multipliers: read active" ON dynamic_multipliers;
CREATE POLICY "dynamic_multipliers: read active" ON dynamic_multipliers
  FOR SELECT TO authenticated
  USING (active_from <= NOW() AND (active_until IS NULL OR active_until > NOW()));

-- Club admins see and manage every multiplier for their own club (including expired / scheduled).
-- Platform-wide rows (club_id IS NULL) can only be written with the service role.
DROP POLICY IF EXISTS "dynamic_multipliers: club admins read" ON dynamic_multipliers;
CREATE POLICY "dynamic_multipliers: club admins read" ON dynamic_multipliers
  FOR SELECT TO authenticated USING (club_id IS NOT NULL AND is_club_admin(club_id));

DROP POLICY IF EXISTS "dynamic_multipliers: club admins write" ON dynamic_multipliers;
CREATE POLICY "dynamic_multipliers: club admins write" ON dynamic_multipliers
  FOR ALL TO authenticated
  USING (club_id IS NOT NULL AND is_club_admin(club_id))
  WITH CHECK (club_id IS NOT NULL AND is_club_admin(club_id));
