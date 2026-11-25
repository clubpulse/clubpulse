-- Do not run. Production is waiting on a backup check.
-- Renames the one clubs row. Checked on 24 Nov 2026: a single row, id below, name Slough CC.
UPDATE public.clubs
SET name = 'Demo Cricket Club'
WHERE id = '0d87a2a4-e6e6-4549-9594-96583c07193c'
  AND name = 'Slough CC';
