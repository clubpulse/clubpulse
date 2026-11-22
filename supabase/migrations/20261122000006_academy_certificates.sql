-- Academy badges: one for finishing each track, and one for finishing all four.
-- Awarded by the server through award_badge() the first time a track is completed. Safe to re-run.

INSERT INTO badges (slug, name, description, emoji, category, rarity) VALUES
  ('academy-skills',   'Academy: Cricket skills',        'Passed every lesson in the ClubPulse Academy Cricket skills track', '🏏', 'milestone', 'common'),
  ('academy-game',     'Academy: Game sense and Laws',   'Passed every lesson in the ClubPulse Academy Game sense and Laws track', '🧠', 'milestone', 'common'),
  ('academy-body',     'Academy: Body and mind',         'Passed every lesson in the ClubPulse Academy Body and mind track', '💪', 'milestone', 'common'),
  ('academy-beyond',   'Academy: Life beyond playing',   'Passed every lesson in the ClubPulse Academy Life beyond playing track', '🌱', 'milestone', 'common'),
  ('academy-graduate', 'Academy Graduate',               'Finished all four ClubPulse Academy tracks', '🎓', 'milestone', 'epic')
ON CONFLICT (slug) DO NOTHING;
