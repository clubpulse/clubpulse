-- Enquiries from the website's contact form and from club admins asking to set up or change
-- their plan. Clubs no longer pay by card on the site: they tell us what they need and we agree
-- a plan with them. Until now the contact form saved nothing.

CREATE TABLE IF NOT EXISTS enquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  club_name    TEXT,
  role         TEXT,
  members      TEXT,                 -- rough size of the club, as chosen on the form
  needs        TEXT[] NOT NULL DEFAULT '{}',   -- what they want ClubPulse to do
  message      TEXT,
  -- Set when a signed-in club admin sends it from the club dashboard
  club_id      UUID REFERENCES clubs(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enquiries_created_idx ON enquiries (created_at DESC);

-- Written only by the server. Read them in the Supabase table editor.
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
