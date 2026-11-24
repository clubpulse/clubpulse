-- Parental consent for accounts whose typed date of birth is under 13.
-- The date of birth is still only a declaration. This records that a guardian email
-- confirmed it. Idempotent. Not a proof of age or of the adult's identity.

CREATE TABLE IF NOT EXISTS public.guardian_consents (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_email TEXT NOT NULL,
  token_hash TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.guardian_consents FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.guardian_consents TO service_role;
