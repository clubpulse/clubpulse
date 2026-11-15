-- ============================================================================
-- Coach Management: profiles, availability, certifications, admin controls
-- ============================================================================

-- ── Coach profiles ──────────────────────────────────────────────────────────
-- Extended info for members with 'coach' role.

CREATE TABLE IF NOT EXISTS coach_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  bio              TEXT,
  specialisations  TEXT[] NOT NULL DEFAULT '{}',       -- e.g. {'batting','bowling'}
  experience_years INTEGER DEFAULT 0,
  hourly_rate_scores INTEGER DEFAULT 0,                -- default Scores cost per hour
  is_approved      BOOLEAN NOT NULL DEFAULT FALSE,     -- club admin must approve
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES auth.users(id),
  is_visible       BOOLEAN NOT NULL DEFAULT TRUE,      -- coach can toggle visibility
  max_sessions_per_week INTEGER DEFAULT 10,
  total_sessions   INTEGER NOT NULL DEFAULT 0,
  total_ratings    INTEGER NOT NULL DEFAULT 0,
  avg_rating       NUMERIC(3,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, club_id)
);

CREATE INDEX IF NOT EXISTS coach_profiles_club_idx ON coach_profiles(club_id, is_approved, is_visible);

-- ── Coach availability slots ────────────────────────────────────────────────
-- Recurring weekly slots a coach is available for sessions.

CREATE TABLE IF NOT EXISTS coach_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  location     TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS coach_avail_coach_idx ON coach_availability(coach_id, day_of_week);

-- ── Coach certifications ────────────────────────────────────────────────────
-- DBS checks, coaching badges, first aid certs, etc.

CREATE TABLE IF NOT EXISTS coach_certifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id         UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  cert_type        TEXT NOT NULL CHECK (cert_type IN (
    'dbs_basic', 'dbs_enhanced', 'ecb_level_1', 'ecb_level_2', 'ecb_level_3',
    'ecb_level_4', 'first_aid', 'safeguarding', 'other'
  )),
  cert_name        TEXT NOT NULL,
  issuing_body     TEXT,
  issue_date       DATE,
  expiry_date      DATE,
  certificate_ref  TEXT,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at      TIMESTAMPTZ,
  verified_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coach_certs_coach_idx ON coach_certifications(coach_id);
CREATE INDEX IF NOT EXISTS coach_certs_expiry_idx ON coach_certifications(expiry_date)
  WHERE expiry_date IS NOT NULL;

-- ── Coach session notes ─────────────────────────────────────────────────────
-- Post-session feedback from coach, private to coach + admin.

CREATE TABLE IF NOT EXISTS coach_session_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES coaching_bookings(id) ON DELETE CASCADE,
  coach_id     UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES auth.users(id),
  notes        TEXT NOT NULL,
  focus_areas  TEXT[] DEFAULT '{}',
  improvement  TEXT,                                   -- observed progress
  next_steps   TEXT,                                   -- recommended next steps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- ── RLS policies ────────────────────────────────────────────────────────────

ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_session_notes ENABLE ROW LEVEL SECURITY;

-- Coach profiles: club members can read approved, coach + admin can write
CREATE POLICY "coach_profiles: club read" ON coach_profiles FOR SELECT TO authenticated
  USING (
    is_approved AND is_visible AND
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = coach_profiles.club_id AND cm.user_id = auth.uid() AND cm.is_active)
  );

CREATE POLICY "coach_profiles: own read" ON coach_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "coach_profiles: own write" ON coach_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "coach_profiles: insert" ON coach_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Availability: coach owns their slots
CREATE POLICY "coach_availability: own" ON coach_availability FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM coach_profiles cp WHERE cp.id = coach_availability.coach_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM coach_profiles cp WHERE cp.id = coach_availability.coach_id AND cp.user_id = auth.uid()));

CREATE POLICY "coach_availability: club read" ON coach_availability FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM coach_profiles cp
    JOIN club_members cm ON cm.club_id = cp.club_id
    WHERE cp.id = coach_availability.coach_id
      AND cm.user_id = auth.uid()
      AND cm.is_active
      AND cp.is_approved
  ));

-- Certifications: coach can CRUD their own; club members can read verified ones
CREATE POLICY "coach_certs: own" ON coach_certifications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM coach_profiles cp WHERE cp.id = coach_certifications.coach_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM coach_profiles cp WHERE cp.id = coach_certifications.coach_id AND cp.user_id = auth.uid()));

CREATE POLICY "coach_certs: club read verified" ON coach_certifications FOR SELECT TO authenticated
  USING (
    verified AND
    EXISTS (
      SELECT 1 FROM coach_profiles cp
      JOIN club_members cm ON cm.club_id = cp.club_id
      WHERE cp.id = coach_certifications.coach_id
        AND cm.user_id = auth.uid()
        AND cm.is_active
    )
  );

-- Session notes: coach + admin (via service role, bypasses RLS)
CREATE POLICY "coach_notes: own" ON coach_session_notes FOR ALL TO authenticated
  USING (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()))
  WITH CHECK (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));

-- ── Helper: auto-create coach profile when member gets coach role ───────────

CREATE OR REPLACE FUNCTION auto_create_coach_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'coach' AND (OLD IS NULL OR OLD.role != 'coach') THEN
    INSERT INTO coach_profiles (user_id, club_id)
    VALUES (NEW.user_id, NEW.club_id)
    ON CONFLICT (user_id, club_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_coach_profile ON club_members;
CREATE TRIGGER trg_auto_coach_profile
  AFTER INSERT OR UPDATE OF role ON club_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_coach_profile();
