# Build 12: what is in it and how to ship it

Build 11 was made on 22 November 2026 and had Readiness, Recovery, Sharing and certificates. Build 12 adds the Cricket Connect screens below. If build 11 has not been submitted yet, send build 12 instead. Version 1.0.0 was submitted for App Store review on 19 November 2026 and has been removed from review.
It was never released, so build 12 goes up under the **same version, 1.0.0**. `app.json` now says build 12
(`ios.buildNumber` and `android.versionCode`) so the file matches this note, but with `appVersionSource: remote` and
`autoIncrement` in `eas.json` the number EAS actually uses comes from its own counter, which goes up by itself. Check
the number EAS reports when the build starts; it should be 12. Nothing has been built or submitted.

## What is new since the build that was submitted

Everything below is in the code; the 19 November build has none of it.

- **Four pillars in the footer**, each with its own colour, and eight pages with one layout: the four role dashboards (Player, Coach, Parent, Admin) and the four pillar pages. Syne headings, cricket-term headings.
- **Role split**: club features for club admins, player features for players, in a separate tab for someone who is both.
- **Wellness**: Warm-Up as full mental preparation, Mind Nets (six weeks), a thought for the day on Warm-Up, Talk to Someone, and from this build the **Readiness check-in with a four-week trend, Recovery Log and Sharing with your coach**.
- **Academy**: certificates for each finished track and for graduating.
- **Rewards in the pillars**, the Honours Board and 108 badges, each shareable.
- **Form Guide**: a coach's view of players' technique progress.
- **Community screens** (Commentary Box, Partnerships with filters, Clubs near you, Notifications, Short for Saturday, My Squad, Scorecard with standard and availability, Nets and Games, and **Approvals** for parents: approve or decline a child's connection with another young person): present, but **off** (see below). The adult-to-junior contact has no app screen; it is website only and behind its own website flag.
- Volunteering parked, scratch cards and the store as before.

## Before you build

1. Run every Supabase migration up to `20261122000010` (`000008` Cricket Connect filters, notifications and audit log; `000009` adult-to-junior contact; `000010` Short for Saturday). None of them switch the Community on. The Readiness, Recovery and Sharing screens need `20261122000001` and `20261122000005`; certificate badges need `20261122000006`.
2. The website must be deployed from `main` (it holds the API routes the new screens call: `/api/wellness/*`, `/api/academy/certificate/[track]` and `/api/community/*`).
3. Leave every `EXPO_PUBLIC_*_ENABLED` flag unset. `eas.json` sets none, so Community, Store, Deals and Volunteers stay off.

## Build and submit

```
cd expo
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production --latest
```

Then in App Store Connect choose the new build for version 1.0.0 and resubmit.

## App Store notes

- The Community has member content and messaging. It is off in this build, so nothing to declare yet. Before a build that turns it on, update the App Privacy answers and the age rating, and add the moderation contact.
- The new Wellness screens save a readiness score, a recovery log and a sharing choice to the person's account. Check the Health & Fitness answers in App Privacy: this data is linked to the user and not used for tracking. This is general wellbeing information, not medical advice, and the screens say so.
- Review notes: a demo account is in the seed script (`scripts/seed-demo-club.ts`, run on a demo project only).

## Checks before sending

- Sign in as a player: Wellness > Readiness saves and the trend shows; Recovery saves and removes; Sharing is off by default and switches on for an adult.
- Sign in as a junior: Sharing is greyed out.
- Academy: finish a track and open the certificate.
- Community is not reachable from any tab.
- With the flag off, `npm test` includes a smoke test that every `/api/community/*` route refuses and never touches the database. It must pass.

## Before the Community is ever switched on

Build 12 still has the Community off. When you later want it on: follow `COMMUNITY.md`, set `COMMUNITY_ENABLED=true` on a **preview** deployment first, sign in as two adults and two linked juniors, and check: Connect and message between adults; a junior sees nobody until a parent is linked and verified; a parent is notified when two juniors connect; a held message appears at `/admin/community/reports`; Short for Saturday posts and replies. Only then change production, and build the app with `EXPO_PUBLIC_COMMUNITY_ENABLED=true` (a flag baked in at build time).
