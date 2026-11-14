CREATE TABLE IF NOT EXISTS club_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('constitution','safeguarding','code_of_conduct','ground_rules','minutes','finance','other')),
  file_url TEXT NOT NULL,  -- Supabase Storage URL
  version TEXT,  -- "v2.1", "2025 Edition"
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES club_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

CREATE INDEX IF NOT EXISTS docs_club_idx ON club_documents(club_id, category, is_active);
CREATE INDEX IF NOT EXISTS acks_user_idx ON document_acknowledgements(user_id, document_id);

ALTER TABLE club_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Members read active docs
DROP POLICY IF EXISTS "club_documents: member read" ON club_documents;
CREATE POLICY "club_documents: member read" ON club_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_documents.club_id AND cm.user_id = auth.uid()) AND is_active);

-- Admin write
DROP POLICY IF EXISTS "club_documents: admin all" ON club_documents;
CREATE POLICY "club_documents: admin all" ON club_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_documents.club_id AND cm.user_id = auth.uid() AND cm.role = 'club_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_documents.club_id AND cm.user_id = auth.uid() AND cm.role = 'club_admin'));

-- Acknowledgements: own write + admin read
DROP POLICY IF EXISTS "document_acknowledgements: own" ON document_acknowledgements;
CREATE POLICY "document_acknowledgements: own" ON document_acknowledgements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "document_acknowledgements: admin read" ON document_acknowledgements;
CREATE POLICY "document_acknowledgements: admin read" ON document_acknowledgements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_documents cd, club_members cm
    WHERE cd.id = document_acknowledgements.document_id AND cm.club_id = cd.club_id AND cm.user_id = auth.uid() AND cm.role = 'club_admin'
  ));
