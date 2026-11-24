-- Safeguarding alerts: who is told when a report is filed or an item is held for review, and a log of every alert.
--
-- All three tables are server-only. Row level security is on, there are no client policies, and every privilege is
-- revoked from anon and authenticated. The app reads and writes them with the service role. Idempotent.

CREATE TABLE IF NOT EXISTS public.safeguarding_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('lead', 'deputy')),
  name TEXT NOT NULL,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One active lead and one active deputy at a time
CREATE UNIQUE INDEX IF NOT EXISTS safeguarding_contacts_one_active_role ON public.safeguarding_contacts (role) WHERE active;

CREATE TABLE IF NOT EXISTS public.safeguarding_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'report:<report id>' or 'held:<kind>:<item id>'. Unique, so one event is only ever one alert.
  event_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('report', 'held')),
  item_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  junior BOOLEAN NOT NULL DEFAULT TRUE,
  -- Already cleaned for sending. Never the reported content, and never a reporter's own words for a junior item.
  reason TEXT,
  link TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.safeguarding_alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.safeguarding_alerts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.safeguarding_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alert_id, contact_id, channel)
);
CREATE INDEX IF NOT EXISTS safeguarding_alert_deliveries_due_idx ON public.safeguarding_alert_deliveries (status, next_attempt_at);

ALTER TABLE public.safeguarding_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safeguarding_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safeguarding_alert_deliveries ENABLE ROW LEVEL SECURITY;

-- Supabase grants anon and authenticated full table privileges by default, so take them away explicitly
REVOKE ALL ON public.safeguarding_contacts FROM anon, authenticated;
REVOKE ALL ON public.safeguarding_alerts FROM anon, authenticated;
REVOKE ALL ON public.safeguarding_alert_deliveries FROM anon, authenticated;
