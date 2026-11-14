-- Add slug to clubs for friendly URLs
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  cricket_background TEXT,
  position_in_queue INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','approved','declined','withdrawn')),
  waiting_creds_awarded INTEGER NOT NULL DEFAULT 0,
  joining_bonus_awarded INTEGER NOT NULL DEFAULT 0,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  UNIQUE(club_id, email)
);

CREATE INDEX IF NOT EXISTS waiting_list_club_idx ON waiting_list(club_id, status, position_in_queue);
CREATE INDEX IF NOT EXISTS waiting_list_user_idx ON waiting_list(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waiting_list: own row" ON waiting_list;
CREATE POLICY "waiting_list: own row" ON waiting_list
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "waiting_list: admin read" ON waiting_list;
CREATE POLICY "waiting_list: admin read" ON waiting_list
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = waiting_list.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('club_admin','coach')
  ));

DROP POLICY IF EXISTS "waiting_list: public insert" ON waiting_list;
CREATE POLICY "waiting_list: public insert" ON waiting_list
  FOR INSERT TO authenticated, anon
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "waiting_list: admin update" ON waiting_list;
CREATE POLICY "waiting_list: admin update" ON waiting_list
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = waiting_list.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('club_admin','coach')
  ));

CREATE OR REPLACE FUNCTION assign_queue_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.position_in_queue := (
    SELECT COALESCE(MAX(position_in_queue), 0) + 1
    FROM waiting_list WHERE club_id = NEW.club_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waiting_list_queue_position ON waiting_list;
CREATE TRIGGER waiting_list_queue_position
  BEFORE INSERT ON waiting_list
  FOR EACH ROW EXECUTE FUNCTION assign_queue_position();

CREATE OR REPLACE FUNCTION approve_waiting_list_entry(p_entry_id UUID, p_joining_bonus INTEGER DEFAULT 500)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry waiting_list%ROWTYPE;
BEGIN
  SELECT * INTO v_entry FROM waiting_list WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND OR v_entry.status != 'waiting' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found_or_not_waiting');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM club_members WHERE club_id = v_entry.club_id AND user_id = auth.uid() AND role IN ('club_admin','coach')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'access_denied');
  END IF;

  IF v_entry.user_id IS NOT NULL THEN
    INSERT INTO creds_wallet (user_id, flexi_balance, reward_balance)
    VALUES (v_entry.user_id, p_joining_bonus, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET flexi_balance = creds_wallet.flexi_balance + p_joining_bonus,
        updated_at = NOW();
  END IF;

  UPDATE waiting_list
  SET status = 'approved',
      joining_bonus_awarded = p_joining_bonus,
      resolved_at = NOW(),
      resolved_by = auth.uid()
  WHERE id = p_entry_id;

  RETURN jsonb_build_object('ok', true, 'joining_bonus', p_joining_bonus);
END;
$$;

GRANT EXECUTE ON FUNCTION approve_waiting_list_entry(UUID, INTEGER) TO authenticated;
