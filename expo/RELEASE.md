# Build 11: what is in it and how to ship it

Version 1.0.0 was submitted for App Store review on 19 November 2026 and has been removed from review.
It was never released, so build 11 goes up under the **same version, 1.0.0**: the build number goes up
by itself (`autoIncrement` in `eas.json`, version source `remote`). Do not edit `buildNumber` in `app.json`.

## What is new since the build that was submitted

Everything below is in the code; the 19 November build has none of it.

- **Four pillars in the footer**, each with its own colour, and eight pages with one layout: the four role dashboards (Player, Coach, Parent, Admin) and the four pillar pages. Syne headings, cricket-term headings.
- **Role split**: club features for club admins, player features for players, in a separate tab for someone who is both.
- **Wellness**: Warm-Up as full mental preparation, Mind Nets (six weeks), a thought for the day on Warm-Up, Talk to Someone, and from this build the **Readiness check-in with a four-week trend, Recovery Log and Sharing with your coach**.
- **Academy**: certificates for each finished track and for graduating.
- **Rewards in the pillars**, the Honours Board and 108 badges, each shareable.
- **Form Guide**: a coach's view of players' technique progress.
- **Community screens** (Commentary Box, Partnerships, My Squad, Scorecard, Nets and Games): present, but **off** (see below).
- Volunteering parked, scratch cards and the store as before.

## Before you build

1. Run every Supabase migration up to `20261122000008` (`20261122000008` adds the Cricket Connect filters, notifications and connection audit log; it does not switch the Community on). The Readiness, Recovery and Sharing screens need `20261122000001` and `20261122000005`; certificate badges need `20261122000006`.
2. The website must be deployed from `main` (it holds the API routes the new screens call: `/api/wellness/*` and `/api/academy/certificate/[track]`).
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
