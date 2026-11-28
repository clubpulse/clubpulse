# Age verification

The rules stay off unless `AGE_VERIFICATION_ENABLED` is exactly `true`. With it off, sign-up, the Community and squad selection behave as they do today.

When it is on:

1. Sign-up requires a real date of birth. After it is saved, the person cannot change it. A DBS-checked club admin, coach or welfare officer can correct it. The previous date, the new date, who changed it and the reason are written to `dob_change_log`. No document number is stored.
2. The same officials confirm a date of birth and record who, when, and the method (passport seen in person, birth certificate, driving licence, existing registration, video call, a verified parent, or a third-party check). The confirmation columns are not writable by a signed-in browser session.
3. Under-13s still need a parent or guardian to confirm by email. If that confirmation is still missing after 14 days, `/api/cron/age-verification-purge` deletes the account. The job uses `CRON_SECRET` and does nothing while the flag is off.
4. An account with no date of birth, or a date nobody has verified, is not treated as an adult. The Community stays closed to them. Solo features such as Analyse stay available once a date of birth has been entered.
5. A junior on an open squad, or an adult on a junior squad, is not added. A safeguarding row is stored with no date of birth, and the welfare officer plus `SAFEGUARDING_LEAD_EMAIL` are emailed. The player sees only: "Your club needs to confirm your date of birth".
6. After sign-in, someone with no date of birth is sent to `/auth/date-of-birth` and cannot continue until it is saved.
7. Someone with no club can be verified as an adult only by the third-party stub, and only when `AGE_VERIFICATION_PROVIDER_ENABLED` is exactly `true` and `AGE_VERIFICATION_PROVIDER` is `mock`. The stub stores a pass or fail. It does not store a document or a date of birth. Under-18s with no club need a verified guardian. A junior's date of birth is not shown to other people.

Purges leave a trail (flag-gated, built now):

- Before an unconfirmed under-13 account is deleted, a row is written to `age_verification_purges` (the id, the clubs the person belonged to, the reason and the date). It has no name, email address or date of birth, and it is kept after the account is gone. If the row cannot be saved, the account is not deleted.
- The club's welfare officers are emailed a reference and the date. If a club has no welfare officer, or the person had no club, the email goes to `SAFEGUARDING_LEAD_EMAIL`. An alert that fails stays unsent and is retried on the next run of the job.
- A club with no welfare officer gets a read-only screen on the Safeguarding page for its DBS-checked club admin: open squad flags, deletion records and where alerts go. Nobody at such a club can close a flag, so a welfare officer has to be added first.
- Closing a squad flag also closes its safeguarding incident.

Migrations, all repo-only until the flag is turned on:

- `supabase/migrations/20261130000001_age_verification.sql`
- `supabase/migrations/20261130000005_age_verification_purge_record.sql` adds the purge record table (service role writes, DBS-checked club staff read their own club's rows).
- `supabase/migrations/20261130000002_age_verification_followup.sql` locks squad-flag reads to DBS-checked staff, stores the correction in one database function, and removes unconfirmed people from the public cards and the club leaderboard.

The mock provider fails closed in production (`VERCEL_ENV` or `NODE_ENV` is `production`): the age-check route answers 404, and a stored mock pass is never treated as verified. `SAFEGUARDING_LEAD_EMAIL` defaults to hello@shiftup.club. A third-party pass stops counting once the person joins a club.
