-- Scores across the pillars. Each is paid only for a successful, live action, and each uses a
-- reference so award_scores pays it once (the first live post of a day, the first readiness
-- check-in of a day, a given nets or pick-up session). Held or removed content is never paid.
-- Academy sources (academy_lesson, academy_track) already exist.

INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('community_post',     'Community post',           'The first post of the day that goes live in the Community feed. Posts held for review do not pay.', 'app', 3, TRUE, 33),
  ('community_session',  'Joined a nets or game',    'Signing up to a nets or pick-up session through the Community.',                                    'app', 5, TRUE, 34),
  ('wellness_readiness', 'Readiness check-in',       'The first pre-match readiness check-in of the day.',                                                'app', 3, TRUE, 35)
ON CONFLICT (source) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;
