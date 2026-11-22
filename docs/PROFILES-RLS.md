# public.profiles access (migration 20261122000012)

## What was wrong
Production had a SELECT policy on `public.profiles`, "Public profiles are viewable", open to `anon` for every active profile. The anon key ships in the web and mobile apps, so anyone could read email, phone, date_of_birth, location and push_token for every active profile. The policy was created outside the migration history.

## What the migration does
- Drops that policy (any name starting "Public profiles are viewable").
- Adds `profiles: read own` (authenticated, `id = auth.uid()`).
- Adds `public.public_profile_cards` (id, display_name, avatar_url, club_name), adults only, readable by signed-in users. Under-18s are excluded by junior membership, a linked child record, and date of birth.
- Prints the policies still on `profiles` as NOTICEs, so the run shows whether any other broad one exists.

## Check before and after (run in the SQL editor)
    select policyname, cmd, roles, qual from pg_policies where schemaname='public' and tablename='profiles';
    -- every table whose policies include anon or public:
    select tablename, policyname, cmd, roles, qual from pg_policies where schemaname='public' and (roles @> '{anon}' or roles @> '{public}') order by 1,2;

After applying, as the anon key: `GET /rest/v1/profiles?select=email&limit=1` should return `[]`.

## Behaviour change: code that reads other people's profiles with the signed-in client
Server code that uses the service role is unaffected. Code that reads another person's profile through the user's own session (directly or as an embed such as `profiles(full_name)`) now gets nothing, and `profiles!inner` embeds drop the row. These files use the signed-in client and embed or read other people's profiles:
`src/app/(dashboard)/log-performance/page.tsx`, `src/lib/actions/infamy.ts`, `mentor.ts`, `availability.ts`, `rivalry.ts`, `ecb-courses.ts`, `coaching.ts`, `form.ts`, `documents.ts`, `dressing-room.ts`, and part of `raffles.ts`.
Test these pages on a Supabase branch before applying to production. The fix for each is to read names with the service role after checking the caller's club membership, or to read `public_profile_cards` (no FK embedding, so look names up by id). That is left out of this PR on purpose: each page needs its own access check and I could not test them against a real database here.

If you want those pages to keep working unchanged in the meantime, the lowest-risk option is a second policy that lets club-mates read each other's rows. It would still expose email/phone to club-mates through the API, so it is not in this migration.

## Exposure that already happened
Treat this as a possible personal-data exposure. Check the Supabase API logs for anon requests to `/rest/v1/profiles`, and take advice on whether it needs reporting. Push tokens were readable, so a leaked token could be used to send notifications to that device.
