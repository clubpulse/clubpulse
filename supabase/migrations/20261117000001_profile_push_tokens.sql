-- Push notification token for the mobile app (written by expo/hooks/usePushNotifications.ts).
-- One token per profile: the most recent device to register wins.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token      TEXT,
  ADD COLUMN IF NOT EXISTS push_platform   TEXT CHECK (push_platform IN ('ios', 'android')),
  ADD COLUMN IF NOT EXISTS push_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_push_token_idx
  ON public.profiles (push_token)
  WHERE push_token IS NOT NULL;
