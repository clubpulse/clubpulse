# Movement checks

Off unless `NEXT_PUBLIC_CAMERA_DRILLS_ENABLED` is exactly `true`. With the flag off, the dashboard, profile and `/drills` do not offer the checks.

The phone camera and the same in-browser pose model used for technique analysis watch a short movement. A skeleton is drawn on the phone and a ring fills as the movement matches the target. Video is not uploaded and is not stored. The saved row is a score and a few numbers (reps, seconds, or degrees).

## Starting point

After sign-in, a skippable card offers four short checks. Skipping it does not block analysis or anything else. The checks can be done later from the profile.

Adults: bodyweight squat, single-leg balance, shoulder circles, and an easy bounce. Under-18s do not get the bounce. They get an easy reach instead. Every check starts with "Warm up first. Stop if you feel pain."

## Daily

One short check a day, chosen from the lower starting scores and whether the player marked batter or bowler. A run of days is counted. Under-18 copy does not talk about losing a run. There is no leaderboard and no share button.

## Who can read a result

The player can read their own rows. A coach can read them only when a coaching booking with that player is confirmed or completed. Anyone else, including signed-out visitors, cannot.

Migration, repo only: `supabase/migrations/20261127000001_camera_drills.sql`. Do not apply it to production until the flag is meant to be on.

## Not covered by the automated tests

The unit tests check rep counting, the ring, the daily pick, and the under-18 list. They do not open a camera or download the pose model. The Postgres check covers who can read a saved row.
