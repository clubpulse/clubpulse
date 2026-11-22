# Website and app: what matches, and what does not

Written 22 November 2026, after the four-pillar website work. It says what is on the website, what the
app has, and what is behind a flag. Nothing in this file turns a flag on.

## The Expo flag

The app's Community screens are behind `EXPO_PUBLIC_COMMUNITY_ENABLED`. It is read when the app is
**built**, so changing it in Vercel does nothing for an installed app. Turning it on needs a new Expo
build (or an OTA update that includes the new value). Build 10 is awaiting Apple review; any change
here needs build 11. Do not set this flag until the website's Community has passed the smoke test in
`COMMUNITY.md` and moderation is staffed. The website flag is separate: `COMMUNITY_ENABLED` (Vercel).

## Pillar by pillar

| Pillar | On the website now | In the app | Gap |
| --- | --- | --- | --- |
| Analysis | Video analysis, progress, Coach AI, Cricket CV | Same, plus recording | None to note |
| Community | Club noticeboard and dressing room (live). Profiles, feed, connections, follows, nets and pick-up games, reports and a staff moderation inbox are built behind `COMMUNITY_ENABLED` (off) | Screens exist behind `EXPO_PUBLIC_COMMUNITY_ENABLED` (off) | Both flags are off. The app has no follow or club profile screens, and no nets and games sessions |
| Wellness | Readiness check-in and four-week trend, match-day checklists and your own routine, mental-skills guides, recovery log, consented coach averages, support page, weekly check-in, match mood, injury log | Warm-Up library with guided breathing circle and timer, Mind Nets, match-day checklists, My Routine | The app does not have the readiness check-in, trend, recovery log or sharing. The website has no animated breathing circle (written steps only). Website data is saved to the account; the app's Warm-Up stays on the phone |
| Academy | Catalogue, lessons with a server-marked check, progress, practice plan, track and graduate certificates, badges, daily games, qualifications log | Lesson player and practice plan (`expo/app/academy.tsx`) | The app does not show certificates yet. Coach-authored courses are not built anywhere |

## Scores

New sources (migration `20261122000007_pillar_scores_rules.sql`): `community_post`, `community_session`,
`wellness_readiness`. They are paid only for successful, live actions and once per reference. The app's
own lesson and daily-check-in earning is unchanged.

## Before a new Expo build

1. Decide whether to set `EXPO_PUBLIC_COMMUNITY_ENABLED` for that build. Default: leave it off.
2. If the app should show certificates or the readiness check-in, those screens still need building.
3. Test the lesson player against the website's `/academy/lessons/[id]`: both mark answers on the server through the same service.
