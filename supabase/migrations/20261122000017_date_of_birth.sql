-- Date of birth decides who is a junior in the Community, so it must exist on every profile. Production already has
-- the column (it predates the repo's migrations); this makes a fresh database match. Nothing is changed or backfilled:
-- an account without a date of birth stays out of the Community until its owner adds one.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
