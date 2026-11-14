-- Only id, name, slug, sport and created_at stay required on clubs. The production table (from the
-- earlier schema) has many more NOT NULL columns than 20260928000011_clubs.sql defines, so each
-- column is checked first: on a database built from these migrations alone, missing ones are skipped.
-- Defaults are kept, so omitted values still get them; only an explicit NULL is newly allowed.
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'short_name',
    'location_address',
    'location_lat',
    'location_lng',
    'location_city',
    'location_postcode',
    'primary_colour',
    'secondary_colour',
    'is_verified',
    'subscription_tier',
    'subscription_active'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clubs' AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE public.clubs ALTER COLUMN %I DROP NOT NULL', col);
    END IF;
  END LOOP;
END;
$$;
