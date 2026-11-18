-- Joining a club. Until now there was no way for a person to become a member: the only club
-- rows were created by hand.
--
-- Each club gets a short join code that an admin shares. Entering it makes a request; an admin
-- approves the request and the person becomes a member. Requests are kept apart from
-- club_members so that a member who has been switched off is never mistaken for a new request.

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS join_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS clubs_join_code_key ON clubs (join_code) WHERE join_code IS NOT NULL;

-- Codes for the clubs that already exist. New codes made by the app avoid look-alike characters;
-- these use what plain SQL offers and can be replaced from the app at any time.
UPDATE clubs
SET join_code = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE join_code IS NULL;

CREATE TABLE IF NOT EXISTS club_join_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS club_join_requests_user_idx ON club_join_requests (user_id);

-- Read and written only by the server, which checks who is asking
ALTER TABLE club_join_requests ENABLE ROW LEVEL SECURITY;
