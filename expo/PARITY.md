# Website and app: what matches, and what does not

Written 22 November 2026, updated the same day when the app caught up (build 11). It says what is on the website, what the
app has, and what is behind a flag. Nothing in this file turns a flag on.

## The Expo flag

The app's Community screens are behind `EXPO_PUBLIC_COMMUNITY_ENABLED`. It is read when the app is
**built**, so changing it in Vercel does nothing for an installed app. Turning it on needs a new Expo
build (or an OTA update that includes the new value). Build 10 is awaiting Apple review; any change
here needs build 11. Do not set this flag until the website's Community has passed the smoke test in
`COMMUNITY.md` and moderation is staffed. The website flag is separate: `COMMUNITY_ENABLED` (Vercel).

## Pillar by pillar

| Pillar | On the website | In the app (build 11) | Still different |
| --- | --- | --- | --- |
| Analysis | Video analysis, progress, Coach AI, Cricket CV | Same, plus recording | None to note |
| Community | Club noticeboard and dressing room (live). Profiles, feed, connections, follows, nets and pick-up games, reports and a moderation inbox are built behind `COMMUNITY_ENABLED` (off) | Feed, Partnerships, My Squad, Scorecard and now **Nets and Games**, all behind `EXPO_PUBLIC_COMMUNITY_ENABLED` (off) | The app has no follow button, club profile pages or session hosting. The website has them behind its own flag |
| Wellness | Readiness check-in and trend, match-day checklists and routine, mental-skills guides, recovery log, consented coach averages, support page | Warm-Up with guided breathing circle, Mind Nets, match-day checklists, My Routine, Talk to Someone, plus now **Readiness check-in with a four-week trend, Recovery Log and Sharing** (saved to your account) | The app's My Routine is the pre-ball routine and stays on the phone; the website's routine is the match-day checklist. The coach's team-averages page is website only. The website has no animated breathing circle |
| Academy | Catalogue, lessons marked on the server, progress, practice plan, track and graduate certificates, badges, daily games | Lesson player, practice plan, daily games, and now **certificates** for each finished track and for graduating | Coach-authored courses are not built anywhere |

## API routes added for the app

`/api/wellness/readiness`, `/api/wellness/recovery`, `/api/wellness/share`, `/api/academy/certificate/[track]`. Each acts only as the signed-in person (taken from the token, never from the request).

## Scores

New sources (migration `20261122000007_pillar_scores_rules.sql`): `community_post`, `community_session`,
`wellness_readiness`. They are paid only for successful, live actions and once per reference. The app's
own lesson and daily-check-in earning is unchanged.

## Building and submitting

See `expo/RELEASE.md`. No Expo flag is on in `eas.json`; Community stays off in this build.
