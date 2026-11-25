-- Club-member player pricing. Repo only until Ishwar applies it.
-- Idempotent. Does not create Stripe products or prices, and does not change existing rows' plans.
--
-- claimed_club_id is the club the player entered at signup or on their profile.
-- pays_member_seats lets that club put members' seats on the club invoice.
-- kind gains club_member, beside the existing individual and club_addon values.
-- member_club_id, billing interval and term_end remember which price was paid, and for how long.
-- confirmed_season is the squad confirmation for one season. lapsed_at and resumed_at time the 90-day return.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS claimed_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

ALTER TABLE public.club_subscriptions
  ADD COLUMN IF NOT EXISTS pays_member_seats BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.player_subscriptions
  ADD COLUMN IF NOT EXISTS payer TEXT,
  ADD COLUMN IF NOT EXISTS member_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_rate_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT,
  ADD COLUMN IF NOT EXISTS term_end TIMESTAMPTZ;

ALTER TABLE public.player_subscriptions DROP CONSTRAINT IF EXISTS player_subscriptions_billing_interval_check;
ALTER TABLE public.player_subscriptions
  ADD CONSTRAINT player_subscriptions_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval IN ('month', 'quarter', 'year'));

ALTER TABLE public.club_members
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_season TEXT;

ALTER TABLE public.club_subscriptions
  ADD COLUMN IF NOT EXISTS lapsed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.club_lapse_notices (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  notice TEXT NOT NULL CHECK (notice IN ('before', 'on_day')),
  period_end DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, notice, period_end)
);
ALTER TABLE public.club_lapse_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_lapse_notices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.club_lapse_notices TO service_role;

ALTER TABLE public.player_subscriptions DROP CONSTRAINT IF EXISTS player_subscriptions_kind_check;
ALTER TABLE public.player_subscriptions
  ADD CONSTRAINT player_subscriptions_kind_check
  CHECK (kind IS NULL OR kind IN ('individual', 'club_addon', 'club_member'));

ALTER TABLE public.player_subscriptions DROP CONSTRAINT IF EXISTS player_subscriptions_payer_check;
ALTER TABLE public.player_subscriptions
  ADD CONSTRAINT player_subscriptions_payer_check
  CHECK (payer IS NULL OR payer IN ('player', 'parent', 'club'));
