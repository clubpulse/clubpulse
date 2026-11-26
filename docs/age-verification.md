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

The migration is `supabase/migrations/20261130000001_age_verification.sql`. Do not apply it to production until the flag is ready to be turned on. The third-party provider flag stays off until a real provider is chosen. The mock is not a real identity check.
