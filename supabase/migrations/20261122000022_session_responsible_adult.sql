-- A junior session names the adult responsible for it. That adult must be an adult member of the club with a current
-- enhanced DBS check recorded there; the server checks this when the session is created and whenever it is shown or
-- joined (src/lib/community/sessions.ts). Adult sessions leave it null.
--
-- Junior sessions created before this have no named adult. They stop being shown or joinable until recreated with one.
-- Nothing is deleted or changed. Idempotent.

ALTER TABLE public.community_sessions
  ADD COLUMN IF NOT EXISTS responsible_adult_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS community_sessions_responsible_adult_idx
  ON public.community_sessions (responsible_adult_id) WHERE responsible_adult_id IS NOT NULL;
