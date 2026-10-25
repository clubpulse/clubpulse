CREATE TABLE IF NOT EXISTS scout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  session_name TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  share_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),  -- for sharing without auth
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  player_codes JSONB NOT NULL DEFAULT '{}',  -- {user_id: "Player Alpha"} mapping
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scout_sessions_club_idx ON scout_sessions(club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scout_sessions_token_idx ON scout_sessions(share_token) WHERE is_active;

ALTER TABLE scout_sessions ENABLE ROW LEVEL SECURITY;

-- Admin/coach write
DROP POLICY IF EXISTS "scout_sessions: admin all" ON scout_sessions;
CREATE POLICY "scout_sessions: admin all" ON scout_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = scout_sessions.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = scout_sessions.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Members can read scout sessions for their own club (they see anonymous data)
DROP POLICY IF EXISTS "scout_sessions: member read" ON scout_sessions;
CREATE POLICY "scout_sessions: member read" ON scout_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = scout_sessions.club_id AND cm.user_id = auth.uid()));

-- Create scout session with anonymous code assignment
CREATE OR REPLACE FUNCTION create_scout_session(
  p_club_id UUID,
  p_session_name TEXT,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_member RECORD;
  v_codes JSONB := '{}';
  v_names TEXT[] := ARRAY['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa',
                           'Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon'];
  v_idx INTEGER := 0;
BEGIN
  -- Check caller is admin/coach
  IF NOT EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = p_club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  -- Assign random code to each member
  FOR v_member IN (SELECT user_id FROM club_members WHERE club_id = p_club_id ORDER BY random()) LOOP
    v_codes := v_codes || jsonb_build_object(v_member.user_id::TEXT, 'Player ' || v_names[v_idx % array_length(v_names,1) + 1]);
    v_idx := v_idx + 1;
  END LOOP;

  INSERT INTO scout_sessions (club_id, created_by, session_name, date_from, date_to, player_codes)
  VALUES (p_club_id, auth.uid(), p_session_name, p_date_from, p_date_to, v_codes)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object('ok', true, 'session_id', v_session_id);
END;
$$;
GRANT EXECUTE ON FUNCTION create_scout_session(UUID, TEXT, DATE, DATE) TO authenticated;
