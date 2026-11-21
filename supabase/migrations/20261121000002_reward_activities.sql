-- Rewards reach the new pillars. Two more things people do that leave no other record:
--   warmup     did a Warm-Up session today (which one is not recorded)
--   mind_week  finished a week of the Mind Nets programme (data: { "week": 1..6 })
-- Technique analyses already leave a row in analysis_results, so they need nothing here.

ALTER TABLE app_activity DROP CONSTRAINT IF EXISTS app_activity_kind_check;
ALTER TABLE app_activity ADD CONSTRAINT app_activity_kind_check
  CHECK (kind IN ('coach_ai', 'daily_question', 'warmup', 'mind_week'));
