# Migration history

Supabase records which migrations a project has run in `supabase_migrations.schema_migrations`. Many migrations here were
applied by hand in the SQL editor, which does not write to that table, so the recorded history stops well before the
newest files in `supabase/migrations/`.

## Why it matters

`supabase db push`, and merging a Supabase branch, apply **every file the history does not list**. Run against production
today, that would re-run dozens of migrations that are already in the database. Some are idempotent; many are not
(`CREATE POLICY` without a drop, `INSERT`s, `ALTER`s). Nobody should run `db push` against the live project until the
history is repaired.

## Repair it (once)

You need the Supabase CLI logged in and linked to the project. Nothing below changes the schema: `repair` only edits the
history table.

1. In the SQL editor, run `select version from supabase_migrations.schema_migrations order by version;` and save the
   output as text to a file outside the repo (for example `~/recorded.txt`). Do not commit it.
2. See what is not recorded: `npx tsx scripts/migration-history.ts --recorded ~/recorded.txt`. It prints; it does not
   connect to anything.
3. For each unrecorded migration, **confirm it is really in the database**: pick one thing it creates (a table, column,
   policy or function) and look for it. To compare tables in bulk, list the ones the files create with
   `grep -ohE "CREATE TABLE( IF NOT EXISTS)? (public\.)?[a-z_]+" supabase/migrations/*.sql | awk '{print $NF}' | sort -u`
   and the ones that exist with
   `select table_name from information_schema.tables where table_schema = 'public' order by 1;`.
   A migration that is **not** in the database must not be marked as applied: leave it, and apply it properly.
4. Print the commands for the ones you confirmed. Mark everything up to a version with `--applied-through <version>`, and
   exclude any in that range that are missing with `--not-applied <v1>,<v2>`. Add stragglers after the cut-off with
   `--applied <v1>,<v2>`. The script refuses versions that are not files in this repo, never includes a version already
   recorded, and prints what it left alone.
5. Run the printed `supabase migration repair --status applied …` commands yourself.
6. Re-run step 1 and then step 2. The only files listed should be the ones you deliberately left.

## Known state (22 November 2026)

- `20261122000011` and `20261122000016` were applied to production by hand and are safe no-ops there.
- `20261122000017` and `20261122000018` were applied through the SQL editor and checked.
- Migrations from open pull requests (`…019` in #165, `…020` in #166, `…021`–`…023` in #167) are **not** in production until
  they are merged and applied. Do not mark them applied before that.

## Going forward

- Apply migrations with the CLI (`supabase db push`), first to a branch and then to production, so the history records
  them.
- If you do paste one into the SQL editor, run `supabase migration repair --status applied <version>` straight afterwards,
  and say so in the pull request.
- Keep migrations idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`), so a re-run is harmless.
