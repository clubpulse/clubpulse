-- Community profiles, follows and parent oversight.
-- Like every community_* table: row level security on, no client policies. The server reads and
-- writes with the service-role client, and applies the safeguarding rules in code.

CREATE TABLE IF NOT EXISTS community_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('player','club')),
  subject_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, subject_type, subject_id),
  CHECK (NOT (subject_type = 'player' AND follower_id = subject_id))
);

CREATE INDEX IF NOT EXISTS community_follows_subject_idx ON community_follows (subject_type, subject_id);

ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS community_club_profiles (
  club_id UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
  headline TEXT,
  about TEXT,
  nets_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE community_club_profiles ENABLE ROW LEVEL SECURITY;

-- Lets a club admin connect a child record to the junior's own ClubPulse account, so the linked
-- parent (via parent_child_links) can oversee that account's Community activity. Optional.
ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS child_profiles_linked_user_idx ON child_profiles (linked_user_id) WHERE linked_user_id IS NOT NULL;
