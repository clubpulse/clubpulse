-- Behaviour of the views and admin functions after every migration, including the follow-up.
-- Production's club_members.role is the user_role enum (player, coach, club_admin, ...). The
-- migration that created the table still has a text check for member/admin/coach/volunteer, which
-- production no longer uses. Drop it here so the rows match production.

ALTER TABLE public.club_members DROP CONSTRAINT IF EXISTS club_members_role_check;

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'adult@club.test'),
  ('22222222-2222-2222-2222-222222222222', 'mate@club.test'),
  ('33333333-3333-3333-3333-333333333333', 'junior@club.test'),
  ('44444444-4444-4444-4444-444444444444', 'stranger@other.test'),
  ('55555555-5555-5555-5555-555555555555', 'admin@club.test'),
  ('66666666-6666-6666-6666-666666666666', 'linked@club.test'),
  ('77777777-7777-7777-7777-777777777777', 'under18@club.test'),
  ('88888888-8888-8888-8888-888888888888', 'flagged@club.test'),
  ('99999999-9999-9999-9999-999999999999', 'inactive@club.test'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'coach@club.test');

UPDATE public.profiles AS p SET
  full_name = v.full_name,
  display_name = v.display_name,
  email = v.email,
  is_active = true,
  date_of_birth = v.dob
FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Adult One', 'Adult', 'adult@club.test', DATE '1990-01-01'),
  ('22222222-2222-2222-2222-222222222222', 'Mate Two', 'Mate', 'mate@club.test', DATE '1991-02-02'),
  ('33333333-3333-3333-3333-333333333333', 'Junior Three', 'Junior', 'junior@club.test', DATE '2014-03-03'),
  ('44444444-4444-4444-4444-444444444444', 'Stranger Four', 'Stranger', 'stranger@other.test', DATE '1988-04-04'),
  ('55555555-5555-5555-5555-555555555555', 'Admin Five', 'Admin', 'admin@club.test', DATE '1985-05-05'),
  ('66666666-6666-6666-6666-666666666666', 'Linked Six', 'Linked', 'linked@club.test', DATE '1993-06-06'),
  ('77777777-7777-7777-7777-777777777777', 'Under Seven', 'Under', 'under18@club.test', DATE '2015-07-07'),
  ('88888888-8888-8888-8888-888888888888', 'Flagged Eight', 'Flagged', 'flagged@club.test', DATE '1992-08-08'),
  ('99999999-9999-9999-9999-999999999999', 'Inactive Nine', 'Inactive', 'inactive@club.test', DATE '1980-09-09'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'Coach Ten', 'Coach', 'coach@club.test', DATE '1982-10-10')
) AS v(id, full_name, display_name, email, dob)
WHERE p.id = v.id;

INSERT INTO public.clubs (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Home CC'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Away CC');

INSERT INTO public.club_members (club_id, user_id, role, is_active, is_junior) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'player', true, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'player', true, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'player', true, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'player', true, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'club_admin', true, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'player', true, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'player', true, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'player', true, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'player', false, false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-111111111111', 'coach', true, false);

INSERT INTO public.child_profiles (id, club_id, first_name, last_name, date_of_birth, linked_user_id) VALUES
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Linked', 'Child', DATE '2012-01-01', '66666666-6666-6666-6666-666666666666');

INSERT INTO public.consent_records (child_id, parent_id, consent_type, action) VALUES
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', '11111111-1111-1111-1111-111111111111', 'photo_video', 'granted');

UPDATE public.creds_wallet SET flexi_balance = v.flexi, reward_balance = v.reward
FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 10, 0),
  ('22222222-2222-2222-2222-222222222222', 50, 5),
  ('33333333-3333-3333-3333-333333333333', 99, 0),
  ('44444444-4444-4444-4444-444444444444', 7, 0),
  ('55555555-5555-5555-5555-555555555555', 3, 0),
  ('99999999-9999-9999-9999-999999999999', 1000, 0)
) AS v(id, flexi, reward)
WHERE creds_wallet.user_id = v.id;

INSERT INTO public.finance_entries (club_id, entry_type, category, description, amount_pence) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'income', 'subs', 'Home subs', 1000),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'income', 'subs', 'Away subs', 5000);

INSERT INTO public.fixtures (id, club_id, opponent, match_date) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Somewhere CC', CURRENT_DATE),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Resolve CC', CURRENT_DATE),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Away CC', CURRENT_DATE);

-- Two correct flat votes and one seam miss. Wallets start at 10, 0 and 50.
INSERT INTO public.pitch_votes (user_id, fixture_id, club_id, prediction) VALUES
  ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'flat'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'flat'),
  ('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'seam');

INSERT INTO public.pitch_results (fixture_id, club_id, actual_condition) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'flat'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'spin');

INSERT INTO public.match_moods (user_id, fixture_id, mood) VALUES
  ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'focused'),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'nervous');

INSERT INTO public.raffles (id, club_id, title, prize_description, ticket_cost_scores, status) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bat', 'A bat', 1, 'active');

-- View options and grants, checked as the owner before any SET ROLE.
DO $$
DECLARE
  opts text;
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY['public_profile_cards', 'club_scores_leaderboard'] LOOP
    SELECT array_to_string(reloptions, ',') INTO opts FROM pg_class WHERE oid = format('public.%I', view_name)::regclass;
    IF opts NOT LIKE '%security_invoker=false%' THEN
      RAISE EXCEPTION '% should run as the owner, options %', view_name, opts;
    END IF;
    IF has_table_privilege('anon', format('public.%I', view_name), 'SELECT') THEN
      RAISE EXCEPTION 'anon can select %', view_name;
    END IF;
    IF NOT has_table_privilege('authenticated', format('public.%I', view_name), 'SELECT') THEN
      RAISE EXCEPTION 'authenticated cannot select %', view_name;
    END IF;
  END LOOP;

  FOREACH view_name IN ARRAY ARRAY['finance_club_summary', 'ground_pitch_history', 'mood_performance_correlation', 'active_consents'] LOOP
    SELECT array_to_string(reloptions, ',') INTO opts FROM pg_class WHERE oid = format('public.%I', view_name)::regclass;
    IF opts NOT LIKE '%security_invoker=true%' THEN
      RAISE EXCEPTION '% should run as the caller, options %', view_name, opts;
    END IF;
    IF has_table_privilege('anon', format('public.%I', view_name), 'SELECT') THEN
      RAISE EXCEPTION 'anon can select %', view_name;
    END IF;
  END LOOP;

  IF has_function_privilege('anon', 'public.draw_raffle(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.seed_infamy_categories(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.resolve_pitch_votes(uuid, text, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.refresh_nemesis_pairs()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute an admin function';
  END IF;
  IF has_function_privilege('authenticated', 'public.refresh_nemesis_pairs()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute refresh_nemesis_pairs';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.refresh_nemesis_pairs()', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute refresh_nemesis_pairs';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.draw_raffle(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute draw_raffle';
  END IF;
END $$;

-- Signed-in adult in the club.
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SET ROLE authenticated;

DO $$
DECLARE
  hidden uuid[] := ARRAY[
    '33333333-3333-3333-3333-333333333333',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888'
  ]::uuid[];
  profiles_visible int;
BEGIN
  IF (SELECT count(*) FROM public.profiles) <> 1 THEN
    RAISE EXCEPTION 'profiles SELECT is no longer own-row only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.public_profile_cards WHERE id = '22222222-2222-2222-2222-222222222222' AND display_name = 'Mate') THEN
    RAISE EXCEPTION 'adult cannot see a fellow adult club member on public_profile_cards';
  END IF;
  IF EXISTS (SELECT 1 FROM public.public_profile_cards WHERE id = ANY (hidden)) THEN
    RAISE EXCEPTION 'a junior is visible on public_profile_cards';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.public_profile_cards WHERE id = '44444444-4444-4444-4444-444444444444') THEN
    RAISE EXCEPTION 'public_profile_cards hid an adult from another club';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_scores_leaderboard
    WHERE user_id = '22222222-2222-2222-2222-222222222222' AND full_name = 'Mate Two' AND total_scores = 55
  ) THEN
    RAISE EXCEPTION 'adult cannot see a fellow adult on the leaderboard';
  END IF;
  IF EXISTS (SELECT 1 FROM public.club_scores_leaderboard WHERE user_id = ANY (hidden)) THEN
    RAISE EXCEPTION 'a junior is visible on the leaderboard';
  END IF;
  IF EXISTS (SELECT 1 FROM public.club_scores_leaderboard WHERE user_id = '99999999-9999-9999-9999-999999999999') THEN
    RAISE EXCEPTION 'an inactive member is on the leaderboard';
  END IF;
  IF EXISTS (SELECT 1 FROM public.club_scores_leaderboard WHERE user_id = '44444444-4444-4444-4444-444444444444') THEN
    RAISE EXCEPTION 'another club is on this caller''s leaderboard';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.finance_club_summary WHERE club_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'member cannot see their club finance summary';
  END IF;
  IF EXISTS (SELECT 1 FROM public.finance_club_summary WHERE club_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'member can see another club''s finance summary';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ground_pitch_history WHERE club_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND actual_condition = 'flat') THEN
    RAISE EXCEPTION 'member cannot see their ground history';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ground_pitch_history WHERE club_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'member can see another club''s ground history';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.mood_performance_correlation WHERE user_id = '11111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'member cannot see their own mood correlation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.mood_performance_correlation WHERE user_id = '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION 'a junior mood is visible to an unrelated adult';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.active_consents
    WHERE child_id = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1' AND parent_id = '11111111-1111-1111-1111-111111111111'
  ) THEN
    RAISE EXCEPTION 'parent cannot see their own consent';
  END IF;

  SELECT count(*) INTO profiles_visible FROM public.profiles;
  IF profiles_visible <> 1 THEN
    RAISE EXCEPTION 'expected one profile row, saw %', profiles_visible;
  END IF;
END $$;

-- Unrelated adult (other club) sees no home-club junior and no home leaderboard.
SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.public_profile_cards WHERE id = '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION 'unrelated adult can see a junior card';
  END IF;
  IF EXISTS (SELECT 1 FROM public.club_scores_leaderboard WHERE club_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'unrelated adult can see the other club leaderboard';
  END IF;
  IF EXISTS (SELECT 1 FROM public.mood_performance_correlation WHERE user_id = '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION 'unrelated adult can see a junior mood';
  END IF;
  IF EXISTS (SELECT 1 FROM public.active_consents) THEN
    RAISE EXCEPTION 'unrelated adult can see consents';
  END IF;
  IF EXISTS (SELECT 1 FROM public.finance_club_summary WHERE club_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'unrelated adult can see the other club finance summary';
  END IF;
END $$;

-- Club admin still sees the junior's mood (staff policy) and the consent, and can run the admin functions.
SELECT set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
DO $$
DECLARE
  drawn jsonb;
  resolved jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mood_performance_correlation WHERE user_id = '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION 'club admin cannot see a junior mood through the invoker view';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.active_consents WHERE child_id = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1') THEN
    RAISE EXCEPTION 'club admin cannot see the club consent';
  END IF;
  IF EXISTS (SELECT 1 FROM public.club_scores_leaderboard WHERE user_id = '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION 'leaderboard shows a junior even to a club admin';
  END IF;

  drawn := public.draw_raffle('cccccccc-cccc-cccc-cccc-cccccccccccc');
  IF drawn->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'club admin draw failed: %', drawn;
  END IF;
  PERFORM public.seed_infamy_categories('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  IF (SELECT count(*) FROM public.infamy_categories WHERE club_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') < 1 THEN
    RAISE EXCEPTION 'seed_infamy_categories wrote nothing';
  END IF;
  resolved := public.resolve_pitch_votes('dddddddd-dddd-dddd-dddd-dddddddddddd', 'flat', NULL);
  IF resolved->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'club admin resolve_pitch_votes failed: %', resolved;
  END IF;
  IF (resolved->>'correct_count')::int IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'expected two correct pitch votes, got %', resolved;
  END IF;
  -- A second call, including one that names a different condition, must not pay again.
  resolved := public.resolve_pitch_votes('dddddddd-dddd-dddd-dddd-dddddddddddd', 'seam', 'second pass');
  PERFORM set_config('test.resolve_pitch_second', COALESCE(resolved->>'error', resolved::text), false);
END $$;

-- A player and a coach are not club admins. They can call the functions and get an error.
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
DO $$
BEGIN
  BEGIN
    PERFORM public.draw_raffle('cccccccc-cccc-cccc-cccc-cccccccccccc');
    RAISE EXCEPTION 'player draw should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%not authorised%' THEN
      RAISE EXCEPTION 'player draw error was %', SQLERRM;
    END IF;
  END;
  BEGIN
    PERFORM public.seed_infamy_categories('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'player seed should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%not authorised%' THEN
      RAISE EXCEPTION 'player seed error was %', SQLERRM;
    END IF;
  END;
  BEGIN
    PERFORM public.resolve_pitch_votes('dddddddd-dddd-dddd-dddd-dddddddddddd', 'seam', NULL);
    RAISE EXCEPTION 'player resolve should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%not authorised%' THEN
      RAISE EXCEPTION 'player resolve error was %', SQLERRM;
    END IF;
  END;
  BEGIN
    PERFORM public.refresh_nemesis_pairs();
    RAISE EXCEPTION 'player refresh should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%permission denied%' THEN
      RAISE EXCEPTION 'player refresh error was %', SQLERRM;
    END IF;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-1111-111111111111', false);
DO $$
BEGIN
  BEGIN
    PERFORM public.draw_raffle('cccccccc-cccc-cccc-cccc-cccccccccccc');
    RAISE EXCEPTION 'coach draw should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%not authorised%' THEN
      RAISE EXCEPTION 'coach draw error was %', SQLERRM;
    END IF;
  END;
  BEGIN
    PERFORM public.resolve_pitch_votes('dddddddd-dddd-dddd-dddd-dddddddddddd', 'seam', NULL);
    RAISE EXCEPTION 'coach resolve should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%not authorised%' THEN
      RAISE EXCEPTION 'coach resolve error was %', SQLERRM;
    END IF;
  END;
  BEGIN
    PERFORM public.seed_infamy_categories('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'coach seed should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%not authorised%' THEN
      RAISE EXCEPTION 'coach seed error was %', SQLERRM;
    END IF;
  END;
END $$;

RESET ROLE;
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.public_profile_cards;
    RAISE EXCEPTION 'anon read public_profile_cards';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.club_scores_leaderboard;
    RAISE EXCEPTION 'anon read club_scores_leaderboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.finance_club_summary;
    RAISE EXCEPTION 'anon read finance_club_summary';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.active_consents;
    RAISE EXCEPTION 'anon read active_consents';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.draw_raffle('cccccccc-cccc-cccc-cccc-cccccccccccc');
    RAISE EXCEPTION 'anon called draw_raffle';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM LIKE '%not authorised%' THEN
      RAISE EXCEPTION 'anon got inside draw_raffle';
    END IF;
  END;
END $$;

RESET ROLE;
SET ROLE service_role;
DO $$
BEGIN
  PERFORM public.refresh_nemesis_pairs();
  IF NOT EXISTS (SELECT 1 FROM public.active_consents WHERE child_id = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1') THEN
    RAISE EXCEPTION 'service role cannot read active_consents';
  END IF;
END $$;

RESET ROLE;

-- Calling resolve_pitch_votes twice credits each winner once (75), and leaves the miss unchanged.
DO $$
DECLARE
  winner_adult integer;
  winner_coach integer;
  loser integer;
  second text;
  recorded text;
BEGIN
  second := current_setting('test.resolve_pitch_second', true);
  SELECT flexi_balance INTO winner_adult FROM public.creds_wallet WHERE user_id = '11111111-1111-1111-1111-111111111111';
  SELECT flexi_balance INTO winner_coach FROM public.creds_wallet WHERE user_id = 'aaaaaaaa-1111-1111-1111-111111111111';
  SELECT flexi_balance INTO loser FROM public.creds_wallet WHERE user_id = '22222222-2222-2222-2222-222222222222';
  SELECT actual_condition INTO recorded FROM public.pitch_results WHERE fixture_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF second IS DISTINCT FROM 'already_resolved' THEN
    RAISE EXCEPTION 'second resolve_pitch_votes should report already_resolved, got %; balances adult % coach % loser %', second, winner_adult, winner_coach, loser;
  END IF;
  IF winner_adult IS DISTINCT FROM 85 OR winner_coach IS DISTINCT FROM 75 THEN
    RAISE EXCEPTION 'winners credited more than once: adult % (expected 85), coach % (expected 75)', winner_adult, winner_coach;
  END IF;
  IF loser IS DISTINCT FROM 50 THEN
    RAISE EXCEPTION 'incorrect pitch vote changed the wallet to %', loser;
  END IF;
  IF recorded IS DISTINCT FROM 'flat' THEN
    RAISE EXCEPTION 'second call changed the recorded condition to %', recorded;
  END IF;
END $$;

-- A 3D pose estimate belongs to the player. A coach cannot read a junior's row, and a junior cannot read an adult's.
INSERT INTO public.technique_pose_frames (user_id, mode, hand, key_event, key_event_frame, times, frames)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'batting', 'right', 'bat_ball_contact', 0, '[0]'::jsonb, '[]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'bowling', 'right', 'release', 0, '[0]'::jsonb, '[]'::jsonb);

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-1111-111111111111', false);
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SET ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.technique_pose_frames) THEN
    RAISE EXCEPTION 'a coach can read a 3D technique estimate';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.technique_pose_frames) <> 1 THEN
    RAISE EXCEPTION 'a junior cannot read only their own 3D estimate';
  END IF;
  IF EXISTS (SELECT 1 FROM public.technique_pose_frames WHERE user_id <> '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION 'a junior can read someone else''s 3D estimate';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.technique_pose_frames WHERE user_id = '33333333-3333-3333-3333-333333333333') THEN
    RAISE EXCEPTION 'another member can read a junior 3D estimate';
  END IF;
END $$;

RESET ROLE;
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.technique_pose_frames;
    RAISE EXCEPTION 'anon read a 3D technique estimate';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
