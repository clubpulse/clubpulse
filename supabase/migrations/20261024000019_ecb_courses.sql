CREATE TABLE IF NOT EXISTS ecb_course_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('coaching','safeguarding','first_aid','officiating','other')),
  level INTEGER,  -- 1,2,3 for coaching levels, NULL for others
  creds_reward INTEGER NOT NULL DEFAULT 0,
  validity_months INTEGER,  -- how long before it expires (NULL = never)
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Seed ECB course types
INSERT INTO ecb_course_types (name, category, level, creds_reward, validity_months, description, display_order) VALUES
  ('ECB All Stars Cricket Leader', 'coaching', 1, 200, NULL, 'Entry-level coaching qualification for All Stars Cricket programme', 10),
  ('ECB Dynamos Cricket Leader', 'coaching', 1, 200, NULL, 'Entry-level coaching qualification for Dynamos Cricket programme', 20),
  ('ECB Core Coach (Level 2)', 'coaching', 2, 500, NULL, 'Foundation coaching qualification - working with players of all ages', 30),
  ('ECB Advanced Coach (Level 3)', 'coaching', 3, 1000, NULL, 'Advanced coaching qualification for high-performance coaching', 40),
  ('ECB Elite Coach (Level 4)', 'coaching', 4, 2000, NULL, 'Elite coaching qualification for professional-level coaching', 50),
  ('ECB Safeguarding & Protecting Young People', 'safeguarding', NULL, 150, 36, 'Mandatory safeguarding course for anyone working with under-18s', 60),
  ('ECB Safe Hands', 'safeguarding', NULL, 150, 36, 'Cricket-specific safeguarding training', 70),
  ('First Aid in Cricket', 'first_aid', NULL, 150, 36, 'Cricket-specific first aid training', 80),
  ('FA Emergency First Aid', 'first_aid', NULL, 100, 36, 'Emergency first aid qualification', 90),
  ('ECB Umpires Association Foundation', 'officiating', 1, 300, NULL, 'Introduction to umpiring', 100),
  ('ACO Level 1 Umpire', 'officiating', 1, 400, NULL, 'Association of Cricket Officials Level 1 umpiring', 110),
  ('ACO Level 2 Umpire', 'officiating', 2, 600, NULL, 'Association of Cricket Officials Level 2 umpiring', 120),
  ('ECB Scorer Award', 'officiating', NULL, 200, NULL, 'Official scoring qualification', 130),
  ('Introduction to Coaching Cricket', 'coaching', NULL, 100, NULL, 'Online introductory module for new coaches', 140),
  ('Inclusive Cricket Leader', 'other', NULL, 200, NULL, 'Disability and inclusive cricket coaching', 150)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS member_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  course_type_id UUID NOT NULL REFERENCES ecb_course_types(id),
  completed_date DATE NOT NULL,
  expires_date DATE,
  certificate_number TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  creds_awarded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, club_id, course_type_id, completed_date)
);

CREATE INDEX IF NOT EXISTS member_qualifications_user_idx ON member_qualifications(user_id, club_id);
CREATE INDEX IF NOT EXISTS member_qualifications_club_idx ON member_qualifications(club_id, is_verified);

ALTER TABLE ecb_course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_qualifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecb_course_types: read all" ON ecb_course_types;
CREATE POLICY "ecb_course_types: read all" ON ecb_course_types FOR SELECT TO authenticated USING (is_active);

DROP POLICY IF EXISTS "member_qualifications: own read" ON member_qualifications;
CREATE POLICY "member_qualifications: own read" ON member_qualifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "member_qualifications: own write" ON member_qualifications;
CREATE POLICY "member_qualifications: own write" ON member_qualifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "member_qualifications: club read" ON member_qualifications;
CREATE POLICY "member_qualifications: club read" ON member_qualifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = member_qualifications.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "member_qualifications: admin verify" ON member_qualifications;
CREATE POLICY "member_qualifications: admin verify" ON member_qualifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = member_qualifications.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Log a qualification and optionally award creds
CREATE OR REPLACE FUNCTION log_qualification(
  p_club_id UUID,
  p_course_type_id UUID,
  p_completed_date DATE,
  p_certificate_number TEXT DEFAULT NULL,
  p_expires_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course ecb_course_types%ROWTYPE;
  v_creds INTEGER;
  v_existing UUID;
BEGIN
  SELECT * INTO v_course FROM ecb_course_types WHERE id = p_course_type_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'course_not_found');
  END IF;

  -- Check duplicate (same course, same date)
  SELECT id INTO v_existing FROM member_qualifications
  WHERE user_id = auth.uid() AND club_id = p_club_id AND course_type_id = p_course_type_id AND completed_date = p_completed_date;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_logged');
  END IF;

  -- Determine expiry if not provided
  IF p_expires_date IS NULL AND v_course.validity_months IS NOT NULL THEN
    p_expires_date := p_completed_date + (v_course.validity_months || ' months')::INTERVAL;
  END IF;

  v_creds := v_course.creds_reward;

  INSERT INTO member_qualifications (user_id, club_id, course_type_id, completed_date, expires_date, certificate_number, creds_awarded)
  VALUES (auth.uid(), p_club_id, p_course_type_id, p_completed_date, p_expires_date, p_certificate_number, v_creds);

  -- Award creds
  IF v_creds > 0 THEN
    INSERT INTO creds_wallet (user_id, flexi_balance) VALUES (auth.uid(), v_creds)
    ON CONFLICT (user_id) DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + v_creds, updated_at = NOW();
  END IF;

  RETURN jsonb_build_object('ok', true, 'creds_awarded', v_creds, 'expires_date', p_expires_date);
END;
$$;

GRANT EXECUTE ON FUNCTION log_qualification(UUID, UUID, DATE, TEXT, DATE) TO authenticated;
