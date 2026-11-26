-- The confirmation link's age, and how many times it has been emailed this hour.
-- token_issued_at is reset whenever a new link is sent. A link older than 7 days is refused.
-- sends_in_window counts emails since send_window_started_at, about 3 per hour.
-- The table stays service-role only: the grants from 20261124000003 are unchanged.

ALTER TABLE public.guardian_consents
  ADD COLUMN IF NOT EXISTS token_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sends_in_window INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS send_window_started_at TIMESTAMPTZ;

UPDATE public.guardian_consents
SET token_issued_at = created_at
WHERE token_issued_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guardian_consents_sends_in_window_check'
  ) THEN
    ALTER TABLE public.guardian_consents
      ADD CONSTRAINT guardian_consents_sends_in_window_check CHECK (sends_in_window >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.guardian_consents.token_issued_at IS
  'When the current confirmation link was issued. Links older than 7 days are refused.';
COMMENT ON COLUMN public.guardian_consents.sends_in_window IS
  'Confirmation emails sent since send_window_started_at. About 3 per hour.';
COMMENT ON COLUMN public.guardian_consents.send_window_started_at IS
  'Start of the current send window. A new window begins an hour after this.';
