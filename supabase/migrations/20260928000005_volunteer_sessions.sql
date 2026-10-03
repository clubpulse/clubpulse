-- Helper used by RLS policies across club tables. SECURITY DEFINER so policies on club_members
-- can call it without recursing into their own RLS. plpgsql so it can be created before
-- club_members exists (migration 9); it is only evaluated when a policy runs.
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND is_active
  );
END;
$$;

REVOKE ALL ON FUNCTION is_club_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_club_admin(UUID) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS volunteer_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL,
  role            TEXT NOT NULL,
  session_date    DATE NOT NULL,
  gps_lat         DOUBLE PRECISION,
  gps_lng         DOUBLE PRECISION,
  gps_confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  club_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  creds_awarded   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- one check-in per person, role and day at a club (stops repeat check-ins re-earning Creds)
  UNIQUE (user_id, club_id, role, session_date)
);

CREATE INDEX IF NOT EXISTS volunteer_sessions_user_idx ON volunteer_sessions(user_id);
CREATE INDEX IF NOT EXISTS volunteer_sessions_club_status_idx ON volunteer_sessions(club_id, status);

ALTER TABLE volunteer_sessions ENABLE ROW LEVEL SECURITY;

-- Read-only for clients. Check-in and approval go through the API (service role), so users
-- cannot insert rows with gps_confirmed = true or their own creds_awarded.
DROP POLICY IF EXISTS "volunteer_sessions: own rows" ON volunteer_sessions;
CREATE POLICY "volunteer_sessions: own rows" ON volunteer_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "volunteer_sessions: club admins read" ON volunteer_sessions;
CREATE POLICY "volunteer_sessions: club admins read" ON volunteer_sessions
  FOR SELECT TO authenticated USING (is_club_admin(club_id));
