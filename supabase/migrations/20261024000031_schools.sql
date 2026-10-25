-- Marks a club as a school programme with age groups
CREATE TABLE IF NOT EXISTS school_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  age_groups TEXT[] NOT NULL DEFAULT ARRAY['U11','U13','U15','U18','Open'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Age group assignment for members (no PII)
CREATE TABLE IF NOT EXISTS school_age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age_group TEXT NOT NULL CHECK (age_group IN ('U11','U13','U15','U18','Open')),
  academic_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  UNIQUE(club_id, user_id, academic_year)
);

-- Session attendance (training/match)
CREATE TABLE IF NOT EXISTS school_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'training' CHECK (session_type IN ('training','match','tour','other')),
  session_name TEXT,
  age_group TEXT,
  attendees UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team selection for a fixture
CREATE TABLE IF NOT EXISTS school_team_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  opposition TEXT NOT NULL,
  age_group TEXT NOT NULL,
  selected_players UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE school_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_team_selections ENABLE ROW LEVEL SECURITY;

-- school_programs: club members read; admins write
DROP POLICY IF EXISTS "school_programs: member read" ON school_programs;
CREATE POLICY "school_programs: member read" ON school_programs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_programs.club_id AND cm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "school_programs: admin all" ON school_programs;
CREATE POLICY "school_programs: admin all" ON school_programs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_programs.club_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_programs.club_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- school_age_groups: member reads own row; admin/coach manage all
DROP POLICY IF EXISTS "school_age_groups: own read" ON school_age_groups;
CREATE POLICY "school_age_groups: own read" ON school_age_groups FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "school_age_groups: admin all" ON school_age_groups;
CREATE POLICY "school_age_groups: admin all" ON school_age_groups FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_age_groups.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_age_groups.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')
  ));

-- school_attendance: members read; admin/coach write
DROP POLICY IF EXISTS "school_attendance: member read" ON school_attendance;
CREATE POLICY "school_attendance: member read" ON school_attendance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_attendance.club_id AND cm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "school_attendance: admin write" ON school_attendance;
CREATE POLICY "school_attendance: admin write" ON school_attendance FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_attendance.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_attendance.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')
  ));

-- school_team_selections: members read; admin/coach write
DROP POLICY IF EXISTS "school_team_selections: member read" ON school_team_selections;
CREATE POLICY "school_team_selections: member read" ON school_team_selections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_team_selections.club_id AND cm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "school_team_selections: admin write" ON school_team_selections;
CREATE POLICY "school_team_selections: admin write" ON school_team_selections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_team_selections.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = school_team_selections.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')
  ));
