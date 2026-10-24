CREATE TABLE IF NOT EXISTS mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  batting_style TEXT CHECK (batting_style IN ('right-hand','left-hand')),
  bowling_style TEXT CHECK (bowling_style IN ('right-arm-fast','right-arm-medium','right-arm-spin','left-arm-fast','left-arm-medium','left-arm-spin','none')),
  speciality TEXT CHECK (speciality IN ('batting','bowling','fielding','wicketkeeping','allround')),
  years_experience INTEGER NOT NULL DEFAULT 1,
  bio TEXT,
  max_mentees INTEGER NOT NULL DEFAULT 2,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed','cancelled')),
  message TEXT,  -- why they want this mentor
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(mentee_user_id, mentor_user_id, club_id)
);

CREATE TABLE IF NOT EXISTS mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES mentor_requests(id) ON DELETE CASCADE,
  mentor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 240),
  notes TEXT,  -- mentor's session notes
  mentee_rating INTEGER CHECK (mentee_rating BETWEEN 1 AND 5),
  mentor_creds_awarded INTEGER NOT NULL DEFAULT 0,
  mentee_creds_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mentor_profiles_club_idx ON mentor_profiles(club_id, is_available);
CREATE INDEX IF NOT EXISTS mentor_requests_mentee_idx ON mentor_requests(mentee_user_id, status);
CREATE INDEX IF NOT EXISTS mentor_requests_mentor_idx ON mentor_requests(mentor_user_id, status);
CREATE INDEX IF NOT EXISTS mentor_sessions_request_idx ON mentor_sessions(request_id);

ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;

-- Mentor profiles: club members can read, own user can write
DROP POLICY IF EXISTS "mentor_profiles: club read" ON mentor_profiles;
CREATE POLICY "mentor_profiles: club read" ON mentor_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = mentor_profiles.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "mentor_profiles: own write" ON mentor_profiles;
CREATE POLICY "mentor_profiles: own write" ON mentor_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Requests: parties involved can read/write
DROP POLICY IF EXISTS "mentor_requests: parties read" ON mentor_requests;
CREATE POLICY "mentor_requests: parties read" ON mentor_requests
  FOR SELECT TO authenticated USING (auth.uid() IN (mentee_user_id, mentor_user_id));

DROP POLICY IF EXISTS "mentor_requests: mentee create" ON mentor_requests;
CREATE POLICY "mentor_requests: mentee create" ON mentor_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentee_user_id);

DROP POLICY IF EXISTS "mentor_requests: parties update" ON mentor_requests;
CREATE POLICY "mentor_requests: parties update" ON mentor_requests
  FOR UPDATE TO authenticated USING (auth.uid() IN (mentee_user_id, mentor_user_id));

-- Sessions: parties can read, mentor can create
DROP POLICY IF EXISTS "mentor_sessions: parties read" ON mentor_sessions;
CREATE POLICY "mentor_sessions: parties read" ON mentor_sessions
  FOR SELECT TO authenticated USING (auth.uid() IN (mentor_user_id, mentee_user_id));

DROP POLICY IF EXISTS "mentor_sessions: mentor create" ON mentor_sessions;
CREATE POLICY "mentor_sessions: mentor create" ON mentor_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_user_id);

-- Atomic session log: awards creds to both mentor and mentee
CREATE OR REPLACE FUNCTION log_mentor_session(
  p_request_id UUID,
  p_session_date DATE,
  p_duration_minutes INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request mentor_requests%ROWTYPE;
  v_mentor_creds INTEGER;
  v_mentee_creds INTEGER;
  v_session_id UUID;
BEGIN
  SELECT * INTO v_request FROM mentor_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_request.status != 'accepted' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;
  IF auth.uid() != v_request.mentor_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'access_denied');
  END IF;

  -- Creds scale with session duration
  v_mentor_creds := LEAST(p_duration_minutes * 2, 300);  -- max 300 per session
  v_mentee_creds := LEAST(p_duration_minutes, 150);       -- max 150 per session

  INSERT INTO mentor_sessions (request_id, mentor_user_id, mentee_user_id, club_id, session_date, duration_minutes, notes, mentor_creds_awarded, mentee_creds_awarded)
  VALUES (p_request_id, v_request.mentor_user_id, v_request.mentee_user_id, v_request.club_id, p_session_date, p_duration_minutes, p_notes, v_mentor_creds, v_mentee_creds)
  RETURNING id INTO v_session_id;

  -- Award creds to mentor
  INSERT INTO creds_wallet (user_id, flexi_balance) VALUES (v_request.mentor_user_id, v_mentor_creds)
  ON CONFLICT (user_id) DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + v_mentor_creds, updated_at = NOW();

  -- Award creds to mentee
  INSERT INTO creds_wallet (user_id, flexi_balance) VALUES (v_request.mentee_user_id, v_mentee_creds)
  ON CONFLICT (user_id) DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + v_mentee_creds, updated_at = NOW();

  -- Update mentor's total_sessions count
  UPDATE mentor_profiles SET total_sessions = total_sessions + 1 WHERE user_id = v_request.mentor_user_id;

  RETURN jsonb_build_object('ok', true, 'session_id', v_session_id, 'mentor_creds', v_mentor_creds, 'mentee_creds', v_mentee_creds);
END;
$$;

GRANT EXECUTE ON FUNCTION log_mentor_session(UUID, DATE, INTEGER, TEXT) TO authenticated;

-- Rate a mentor session (by mentee only)
CREATE OR REPLACE FUNCTION rate_mentor_session(p_session_id UUID, p_rating INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session mentor_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM mentor_sessions WHERE id = p_session_id;
  IF NOT FOUND OR auth.uid() != v_session.mentee_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'access_denied');
  END IF;
  IF v_session.mentee_rating IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_rated');
  END IF;

  UPDATE mentor_sessions SET mentee_rating = p_rating WHERE id = p_session_id;
  UPDATE mentor_profiles
  SET avg_rating = (SELECT AVG(mentee_rating) FROM mentor_sessions WHERE mentor_user_id = v_session.mentor_user_id AND mentee_rating IS NOT NULL)
  WHERE user_id = v_session.mentor_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION rate_mentor_session(UUID, INTEGER) TO authenticated;
