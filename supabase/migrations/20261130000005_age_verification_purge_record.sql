-- A lasting record of every account the under-13 purge deletes. Repo only. Idempotent.
-- The account is gone afterwards, so the row keeps the id (no foreign key), the clubs the person belonged to,
-- why it was deleted, and whether the club was told. It never holds a name, an email address or a date of birth.

CREATE TABLE IF NOT EXISTS public.age_verification_purges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purged_user_id UUID NOT NULL,
  club_ids UUID[] NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL DEFAULT 'under_13_no_guardian_confirmation_after_14_days',
  purged_at TIMESTAMPTZ,
  alert_sent_at TIMESTAMPTZ,
  alert_attempts INTEGER NOT NULL DEFAULT 0 CHECK (alert_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One record per account, even if the job runs twice.
CREATE UNIQUE INDEX IF NOT EXISTS age_verification_purges_user_idx ON public.age_verification_purges (purged_user_id);
CREATE INDEX IF NOT EXISTS age_verification_purges_unalerted_idx ON public.age_verification_purges (created_at) WHERE alert_sent_at IS NULL;

ALTER TABLE public.age_verification_purges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.age_verification_purges FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.age_verification_purges TO authenticated;
GRANT ALL ON public.age_verification_purges TO service_role;

-- DBS-checked club staff can read the records that name their club. Nobody can write them from a browser session.
DROP POLICY IF EXISTS age_verification_purges_club_read ON public.age_verification_purges;
CREATE POLICY age_verification_purges_club_read ON public.age_verification_purges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_members cm
      JOIN public.dbs_checks d ON d.user_id = cm.user_id AND d.club_id = cm.club_id
      WHERE cm.club_id = ANY (age_verification_purges.club_ids)
        AND cm.user_id = auth.uid()
        AND cm.is_active
        AND cm.role IN ('club_admin', 'welfare_officer')
        AND d.status = 'valid'
        AND d.check_type IN ('enhanced', 'enhanced_barred')
        AND (d.expiry_date IS NULL OR d.expiry_date >= CURRENT_DATE)
    )
  );
