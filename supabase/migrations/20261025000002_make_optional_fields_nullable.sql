-- Non-essential columns that were NOT NULL with no default in production: descriptions, summaries,
-- icons/URLs and venue/location text. Found with an information_schema query on the live database.
-- Kept required: primary and foreign keys, names/titles, defining dates, category/kind columns,
-- score/points/money amounts (totals and balances depend on them) and content that is the record
-- itself (post bodies, file_url). Each change is guarded so a fresh build without the column skips it.

-- badge_definitions.description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'badge_definitions' AND column_name = 'description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.badge_definitions ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- badge_definitions.icon_url: URL
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'badge_definitions' AND column_name = 'icon_url' AND is_nullable = 'NO') THEN
    ALTER TABLE public.badge_definitions ALTER COLUMN icon_url DROP NOT NULL;
  END IF;
END $$;

-- badges.description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.badges ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- badges.emoji: display icon
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'emoji' AND is_nullable = 'NO') THEN
    ALTER TABLE public.badges ALTER COLUMN emoji DROP NOT NULL;
  END IF;
END $$;

-- club_milestones.description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'club_milestones' AND column_name = 'description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.club_milestones ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- coaching_sessions.location: location
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'coaching_sessions' AND column_name = 'location' AND is_nullable = 'NO') THEN
    ALTER TABLE public.coaching_sessions ALTER COLUMN location DROP NOT NULL;
  END IF;
END $$;

-- creds_transactions.description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'creds_transactions' AND column_name = 'description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.creds_transactions ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- cricket_matches.venue: location
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'cricket_matches' AND column_name = 'venue' AND is_nullable = 'NO') THEN
    ALTER TABLE public.cricket_matches ALTER COLUMN venue DROP NOT NULL;
  END IF;
END $$;

-- finance_entries.description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'finance_entries' AND column_name = 'description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.finance_entries ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- merchant_offers.description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'merchant_offers' AND column_name = 'description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.merchant_offers ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- player_legacy.career_summary: summary text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'player_legacy' AND column_name = 'career_summary' AND is_nullable = 'NO') THEN
    ALTER TABLE public.player_legacy ALTER COLUMN career_summary DROP NOT NULL;
  END IF;
END $$;

-- player_legacy.years_at_club: descriptive text, e.g. "2018–2025"
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'player_legacy' AND column_name = 'years_at_club' AND is_nullable = 'NO') THEN
    ALTER TABLE public.player_legacy ALTER COLUMN years_at_club DROP NOT NULL;
  END IF;
END $$;

-- pot_proposals.description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'pot_proposals' AND column_name = 'description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.pot_proposals ALTER COLUMN description DROP NOT NULL;
  END IF;
END $$;

-- raffles.prize_description: description text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'raffles' AND column_name = 'prize_description' AND is_nullable = 'NO') THEN
    ALTER TABLE public.raffles ALTER COLUMN prize_description DROP NOT NULL;
  END IF;
END $$;
