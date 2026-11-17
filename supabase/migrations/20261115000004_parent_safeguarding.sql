-- ============================================================================
-- Parent Backend — Child Linking, Consent Flows, Safeguarding
-- ============================================================================

-- ── Child profiles ──────────────────────────────────────────────────────────
-- Juniors under 18 who need parental consent to participate.

CREATE TABLE IF NOT EXISTS child_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender        TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  medical_notes TEXT,                                -- allergies, conditions (encrypted at app layer)
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  photo_consent BOOLEAN NOT NULL DEFAULT FALSE,
  data_consent  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS child_profiles_club ON child_profiles(club_id);

-- ── Parent-child links ──────────────────────────────────────────────────────
-- Links a parent/guardian user account to one or more child profiles.

CREATE TABLE IF NOT EXISTS parent_child_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id      UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  relationship  TEXT NOT NULL DEFAULT 'parent'
                  CHECK (relationship IN ('parent','guardian','carer')),
  is_primary    BOOLEAN NOT NULL DEFAULT TRUE,       -- primary contact
  verified_at   TIMESTAMPTZ,                         -- admin verified the link
  verified_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

CREATE INDEX IF NOT EXISTS pcl_parent ON parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS pcl_child ON parent_child_links(child_id);

-- ── Consent records ─────────────────────────────────────────────────────────
-- Immutable audit trail of every consent given/withdrawn.

CREATE TYPE consent_type AS ENUM (
  'photo_video',           -- photos & video at events
  'data_processing',       -- personal data handling
  'medical_treatment',     -- emergency medical treatment
  'travel',                -- travel to away fixtures
  'social_media',          -- club social media posts
  'coaching_observation',  -- one-to-one coaching
  'general_participation'  -- general club participation
);

CREATE TYPE consent_action AS ENUM ('granted', 'withdrawn');

CREATE TABLE IF NOT EXISTS consent_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  parent_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type  consent_type NOT NULL,
  action        consent_action NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consent_child ON consent_records(child_id, consent_type);
CREATE INDEX IF NOT EXISTS consent_parent ON consent_records(parent_id);

-- ── Active consent view ─────────────────────────────────────────────────────
-- Latest consent state per child per type.

CREATE OR REPLACE VIEW active_consents AS
SELECT DISTINCT ON (child_id, consent_type)
  child_id,
  consent_type,
  action,
  parent_id,
  created_at
FROM consent_records
ORDER BY child_id, consent_type, created_at DESC;

-- ── Safeguarding incidents ──────────────────────────────────────────────────
-- Confidential log of safeguarding concerns.

CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('reported', 'under_review', 'escalated', 'resolved', 'closed');

CREATE TABLE IF NOT EXISTS safeguarding_incidents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  child_id       UUID REFERENCES child_profiles(id),  -- nullable if about an adult
  reported_by    UUID NOT NULL REFERENCES auth.users(id),
  severity       incident_severity NOT NULL DEFAULT 'low',
  status         incident_status NOT NULL DEFAULT 'reported',
  category       TEXT NOT NULL CHECK (category IN (
    'welfare_concern','bullying','discrimination',
    'code_of_conduct','injury','other'
  )),
  description    TEXT NOT NULL,
  actions_taken  TEXT,
  outcome        TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_to    UUID REFERENCES auth.users(id),      -- safeguarding officer
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sgi_club ON safeguarding_incidents(club_id, status);
CREATE INDEX IF NOT EXISTS sgi_child ON safeguarding_incidents(child_id);

-- ── Safeguarding notes (follow-ups) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS safeguarding_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   UUID NOT NULL REFERENCES safeguarding_incidents(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES auth.users(id),
  note          TEXT NOT NULL,
  is_internal   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DBS / background check tracking ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dbs_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_type      TEXT NOT NULL CHECK (check_type IN ('basic','standard','enhanced','enhanced_barred')),
  certificate_number TEXT,
  issue_date      DATE,
  expiry_date     DATE,                                -- typically 3 years
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','valid','expired','rejected')),
  verified_by     UUID REFERENCES auth.users(id),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, user_id, check_type)
);

CREATE INDEX IF NOT EXISTS dbs_club ON dbs_checks(club_id, status);
CREATE INDEX IF NOT EXISTS dbs_expiry ON dbs_checks(expiry_date) WHERE status = 'valid';

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE safeguarding_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE safeguarding_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dbs_checks ENABLE ROW LEVEL SECURITY;

-- Child profiles: parent sees own children; admin sees club children
CREATE POLICY "child: parent" ON child_profiles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM parent_child_links pcl
    WHERE pcl.child_id = child_profiles.id
      AND pcl.parent_id = auth.uid()
  ));

CREATE POLICY "child: admin" ON child_profiles FOR ALL TO authenticated
  USING (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));

-- Parent-child links: own links + admin
CREATE POLICY "pcl: own" ON parent_child_links FOR ALL TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "pcl: admin" ON parent_child_links FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = parent_child_links.child_id
      AND is_club_admin(cp.club_id)
  ));

-- Consent records: parent can insert own; admin can read
CREATE POLICY "consent: parent write" ON consent_records FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "consent: parent read" ON consent_records FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "consent: admin read" ON consent_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM child_profiles cp
    WHERE cp.id = consent_records.child_id
      AND is_club_admin(cp.club_id)
  ));

-- Safeguarding: only admin + assigned officer
CREATE POLICY "sgi: admin" ON safeguarding_incidents FOR ALL TO authenticated
  USING (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));

CREATE POLICY "sgi: assigned" ON safeguarding_incidents FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "sgi: reporter" ON safeguarding_incidents FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

-- Safeguarding notes: admin only
CREATE POLICY "sgn: admin" ON safeguarding_notes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM safeguarding_incidents si
    WHERE si.id = safeguarding_notes.incident_id
      AND is_club_admin(si.club_id)
  ));

-- DBS: own + admin
CREATE POLICY "dbs: own" ON dbs_checks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "dbs: admin" ON dbs_checks FOR ALL TO authenticated
  USING (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));
