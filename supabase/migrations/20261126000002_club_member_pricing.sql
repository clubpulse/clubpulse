-- Club-member player pricing. Repo only until Ishwar applies it.
-- Idempotent. Does not create Stripe products or prices, and does not change existing rows' plans.
--
-- claimed_club_id is the club the player entered at signup or on their profile.
-- pays_member_seats lets that club put members' seats on the club invoice.
-- kind gains club_member, beside the existing individual and club_addon values.
-- member_club_id and member_rate_until remember a member price until the next renewal.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS claimed_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

ALTER TABLE public.club_subscriptions
  ADD COLUMN IF NOT EXISTS pays_member_seats BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.player_subscriptions
  ADD COLUMN IF NOT EXISTS payer TEXT,
  ADD COLUMN IF NOT EXISTS member_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_rate_until TIMESTAMPTZ;

ALTER TABLE public.player_subscriptions DROP CONSTRAINT IF EXISTS player_subscriptions_kind_check;
ALTER TABLE public.player_subscriptions
  ADD CONSTRAINT player_subscriptions_kind_check
  CHECK (kind IS NULL OR kind IN ('individual', 'club_addon', 'club_member'));

ALTER TABLE public.player_subscriptions DROP CONSTRAINT IF EXISTS player_subscriptions_payer_check;
ALTER TABLE public.player_subscriptions
  ADD CONSTRAINT player_subscriptions_payer_check
  CHECK (payer IS NULL OR payer IN ('player', 'parent', 'club'));
