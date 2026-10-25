-- Transfer requests between clubs (ECB-style workflow)
CREATE TABLE IF NOT EXISTS transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  to_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  season INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_club_id, to_club_id, player_user_id, season)
);

ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfer_requests: player read" ON transfer_requests;
CREATE POLICY "transfer_requests: player read" ON transfer_requests
  FOR SELECT TO authenticated USING (auth.uid() = player_user_id);

DROP POLICY IF EXISTS "transfer_requests: club admin read" ON transfer_requests;
CREATE POLICY "transfer_requests: club admin read" ON transfer_requests
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('admin','coach')
        AND (cm.club_id = from_club_id OR cm.club_id = to_club_id)
    )
  );

DROP POLICY IF EXISTS "transfer_requests: player create" ON transfer_requests;
CREATE POLICY "transfer_requests: player create" ON transfer_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_user_id);

DROP POLICY IF EXISTS "transfer_requests: update" ON transfer_requests;
CREATE POLICY "transfer_requests: update" ON transfer_requests
  FOR UPDATE TO authenticated USING (
    auth.uid() = player_user_id
    OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('admin','coach')
        AND (cm.club_id = from_club_id OR cm.club_id = to_club_id)
    )
  );
