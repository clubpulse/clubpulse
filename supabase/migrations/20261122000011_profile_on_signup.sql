-- Every account gets a public.profiles row (and its self-serve role rows), even when the confirmation link is
-- opened in a different browser from the sign-up and never reaches /auth/callback.
--
-- Production already has ensure_profile_and_roles(), create_profile_for_user() and the trigger
-- on_auth_user_created_profile, applied outside the migration history. This migration brings the repository and the
-- database back together: CREATE OR REPLACE the two functions, and DROP and recreate the ONE profile trigger.
-- The existing wallet triggers on auth.users (on_auth_user_created, on_auth_user_created_wallet) are left alone.
--
-- Why a confirmed user could still have no profile: create_profile_for_user() caught every error with only a
-- WARNING, so the auth.users insert committed even when the profile insert failed. One cause was
-- create_wallet_for_new_user() (trigger on_profile_created on profiles): an INSERT into creds_wallets with no
-- ON CONFLICT, so any clash rolled the profile insert back. Both are fixed below.
--
-- Mirrors src/lib/auth/onboarding.ts (ensureProfileAndRoles): same metadata keys (full_name, name, roles), same
-- self-serve role allow-list (player, volunteer, parent, coach; never club_admin or merchant), default player.
-- profiles.role is a different, text column (default 'user') and is left to its default.

CREATE OR REPLACE FUNCTION public.ensure_profile_and_roles(p_id UUID, p_email TEXT, p_meta JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  meta JSONB := COALESCE(p_meta, '{}'::jsonb);
  nm TEXT;
  r TEXT;
  first_role BOOLEAN := TRUE;
BEGIN
  nm := left(btrim(COALESCE(NULLIF(meta->>'full_name', ''), NULLIF(meta->>'name', ''), '')), 100);
  IF nm = '' THEN nm := COALESCE(NULLIF(split_part(COALESCE(p_email, ''), '@', 1), ''), 'Athlete'); END IF;

  INSERT INTO public.profiles (id, full_name, display_name, email)
  VALUES (p_id, nm, split_part(nm, ' ', 1), COALESCE(p_email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- Roles only for someone who has none yet, so an existing person's roles are never touched
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_id) THEN
    IF jsonb_typeof(meta->'roles') = 'array' THEN
      FOR r IN
        SELECT x FROM jsonb_array_elements_text(meta->'roles') WITH ORDINALITY AS t(x, n)
        WHERE x IN ('player', 'volunteer', 'parent', 'coach') ORDER BY n
      LOOP
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_id AND role = r::public.user_role) THEN
          INSERT INTO public.user_roles (user_id, role, is_primary) VALUES (p_id, r::public.user_role, first_role);
          first_role := FALSE;
        END IF;
      END LOOP;
    END IF;
    IF first_role THEN
      INSERT INTO public.user_roles (user_id, role, is_primary) VALUES (p_id, 'player', TRUE);
    END IF;
  END IF;
END;
$$;

-- The trigger. If the full helper fails, a last-resort default profile is still written so the account is never left
-- without one (the app then fills in roles on first visit). If even that fails the error is raised, so the problem is
-- seen at sign-up instead of surfacing later as "Profile not found".
CREATE OR REPLACE FUNCTION public.create_profile_for_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    PERFORM public.ensure_profile_and_roles(NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data, '{}'::jsonb));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ensure_profile_and_roles failed for %: % (writing a default profile)', NEW.id, SQLERRM;
    INSERT INTO public.profiles (id, full_name, display_name, email)
    VALUES (NEW.id, 'Athlete', 'Athlete', COALESCE(NULLIF(NEW.email, ''), NEW.id::text || '@no-email.invalid'))
    ON CONFLICT (id) DO NOTHING;
  END;
  RETURN NEW;
END;
$$;

-- One profile trigger, not two
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();

-- The profile's own wallet trigger must never abort profile creation (creds_wallets.user_id is UNIQUE).
-- The wallet the app uses is creds_wallet (singular), which create_wallet_for_user() already fills.
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.creds_wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- These run as the trigger only. Nobody signed in can call them with someone else's id.
REVOKE ALL ON FUNCTION public.ensure_profile_and_roles(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_profile_for_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_wallet_for_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_and_roles(UUID, TEXT, JSONB) TO service_role;

-- Backfill: confirmed accounts with no profile. Does nothing for anyone who already has one (no names overwritten)
-- and is safe to run again. On production data at the time of writing it changes no rows.
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT a.id, a.email, a.raw_user_meta_data FROM auth.users a
    WHERE a.email_confirmed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.id)
  LOOP
    PERFORM public.ensure_profile_and_roles(u.id, u.email, COALESCE(u.raw_user_meta_data, '{}'::jsonb));
  END LOOP;
END;
$$;
