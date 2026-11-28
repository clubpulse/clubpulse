# Age verification

The rules stay off unless `AGE_VERIFICATION_ENABLED` is exactly `true`. With it off, sign-up, the Community and squad selection behave as they do today.

When it is on:

1. Sign-up requires a real date of birth. After it is saved, the person cannot change it. A DBS-checked club admin, coach or welfare officer can correct it. The previous date, the new date, who changed it and the reason are written to `dob_change_log`. No document number is stored.
2. The same officials confirm a date of birth and record who, when, and the method (passport seen in person, birth certificate, driving licence, existing registration, video call, a verified parent, or a third-party check). The confirmation columns are not writable by a signed-in browser session.
3. Under-13s still need a parent or guardian to confirm by email. If that confirmation is still missing after 14 days, `/api/cron/age-verification-purge` deletes the account. The job uses `CRON_SECRET` and does nothing while the flag is off.
4. An account with no date of birth, or a date nobody has verified, is not treated as an adult. The Community stays closed to them. Solo features such as Analyse stay available once a date of birth has been entered.
5. A junior on an open squad, or an adult on a junior squad, is not added. A safeguarding row is stored with no date of birth, and the club's welfare officer is emailed (or, with no welfare officer, the active platform safeguarding leads), with `SAFEGUARDING_LEAD_EMAIL` as an extra copy only. The player sees only: "Your club needs to confirm your date of birth".
6. After sign-in, someone with no date of birth is sent to `/auth/date-of-birth` and cannot continue until it is saved.
7. Someone with no club can be verified as an adult only by the third-party stub, and only when `AGE_VERIFICATION_PROVIDER_ENABLED` is exactly `true` and `AGE_VERIFICATION_PROVIDER` is `mock`. The stub stores a pass or fail. It does not store a document or a date of birth. Under-18s with no club need a verified guardian. A junior's date of birth is not shown to other people.

Purges leave a trail (flag-gated, built now):

- Before an unconfirmed under-13 account is deleted, a row is written to `age_verification_purges` (the id, the clubs the person belonged to, the reason and the date). It has no name, email address or date of birth, and it is kept after the account is gone. If the row cannot be saved, the account is not deleted.
- The club's welfare officers are emailed a reference and the date. If a club has no welfare officer, or the person had no club, the email goes to the active platform safeguarding leads, with `SAFEGUARDING_LEAD_EMAIL` as an extra copy, and names each club and whether it has a welfare officer. An alert that fails stays unsent and is retried on the next run of the job.
- A club with no welfare officer gets a read-only screen on the Safeguarding page for its DBS-checked club admin: open squad flags, deletion records and where alerts go. Nobody at such a club can close a flag, so a welfare officer has to be added first.
- Closing a squad flag also closes its safeguarding incident.

Migrations, all repo-only until the flag is turned on:

- `supabase/migrations/20261130000001_age_verification.sql`
- `supabase/migrations/20261130000005_age_verification_purge_record.sql` adds the purge record table (service role writes, DBS-checked club staff read their own club's rows).
- `supabase/migrations/20261130000002_age_verification_followup.sql` locks squad-flag reads to DBS-checked staff, stores the correction in one database function, and removes unconfirmed people from the public cards and the club leaderboard.

The mock provider fails closed in production (`VERCEL_ENV` or `NODE_ENV` is `production`): the age-check route answers 404, and a stored mock pass is never treated as verified. `SAFEGUARDING_LEAD_EMAIL` defaults to hello@shiftup.club. A third-party pass stops counting once the person joins a club.

## Platform safeguarding lead (clubs with no welfare officer)

A club with no welfare officer has nobody who may close a squad flag. A **platform safeguarding lead** can, from `/safeguarding-lead`.

- The role is a row in `platform_safeguarding_leads`, written by SHIFTUP staff in the database. The app has no way to grant it, and the table is closed to the API. It holds an enhanced DBS check date and a safeguarding training date, and **the role is inactive unless both are current**: DBS no older than 3 years, training no older than 12 months. These windows are a policy choice, set in `platform_lead_is_active()` and in `LEAD_DBS_MAX_AGE_YEARS` / `LEAD_TRAINING_MAX_AGE_MONTHS`. Change both together.
- Granting (run as the database owner, with both dates): `INSERT INTO platform_safeguarding_leads (user_id, granted_by, dbs_checked_on, training_completed_on) VALUES (...)`. Withdraw with `UPDATE ... SET revoked_at = now()`.
- The queue shows open flags at clubs with no active welfare officer: club, player, squad, why, how long open. No date of birth.
- Closing a flag needs a written note. Flags and their safeguarding incident close in **one database transaction** (`resolve_age_squad_flag`).
- **Conflict of interest.** A lead cannot decide a flag about themselves, at a club they belong to, or on an incident they reported. These are left out of their queue and refused in the app and again in the database. Another lead decides them.
- **Audit.** Every queue view and every decision or refusal is written to `safeguarding_lead_audit`, which cannot be edited or deleted. A view that cannot be recorded is not shown.
- **Hand-over.** When a club names a welfare officer, a trigger records each open flag as handed to them (`age_flag_handovers`). The daily job emails them once. Nothing is deleted: the audit rows and hand-over rows are the history. From then on the flags are the officer's and leads can no longer close them.
