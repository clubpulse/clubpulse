-- Restore coach_session_notes.
--
-- 20261115000002_coach_management.sql was applied by hand, and only in part:
-- production has the rest of that file, but not this table and not the
-- "coach_notes: own" policy. Databases that already applied the whole file
-- (local, branch) already have both. Every statement below is a no-op when
-- the object is already there, and creates it when it is not.
--
-- Shape matches 20261115000002: same columns, the unique index on booking_id,
-- RLS enabled, and the same coach-owns-the-row policy. Admin reads stay on
-- the service role, which bypasses RLS, as that file's comment describes.

CREATE TABLE IF NOT EXISTS coach_session_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES coaching_bookings(id) ON DELETE CASCADE,
  coach_id     UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES auth.users(id),
  notes        TEXT NOT NULL,
  focus_areas  TEXT[] DEFAULT '{}',
  improvement  TEXT,
  next_steps   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- CREATE TABLE IF NOT EXISTS does not add the unique constraint when the
-- table is already there. Postgres has no ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coach_session_notes'::regclass
      AND conname = 'coach_session_notes_booking_id_key'
  ) THEN
    ALTER TABLE public.coach_session_notes
      ADD CONSTRAINT coach_session_notes_booking_id_key UNIQUE (booking_id);
  END IF;
END $$;

-- Foreign-key indexes. 20261115000002 indexes the foreign keys on the sibling
-- coach tables and leaves these two unindexed. Postgres does not index a
-- foreign key itself, and the policy below filters on coach_id.
CREATE INDEX IF NOT EXISTS coach_session_notes_coach_idx ON coach_session_notes (coach_id);
CREATE INDEX IF NOT EXISTS coach_session_notes_player_idx ON coach_session_notes (player_id);

ALTER TABLE coach_session_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_notes: own" ON coach_session_notes;
CREATE POLICY "coach_notes: own" ON coach_session_notes
  FOR ALL
  TO authenticated
  USING (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()))
  WITH CHECK (coach_id IN (SELECT id FROM coach_profiles WHERE user_id = auth.uid()));

-- The Data API only sees a table the role can use. RLS still limits
-- authenticated to the coach's own rows; service_role bypasses RLS for admin.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coach_session_notes TO authenticated, service_role;
