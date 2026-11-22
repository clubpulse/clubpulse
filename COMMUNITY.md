# Community: turning it on, and turning it off again

The Community (feed, profiles, connections, follows, messages) is off by default. Nothing in it is live until
`COMMUNITY_ENABLED` is exactly `true` in the Vercel environment. Do not flip it from code or from a pull request.

## Before you turn it on

Preferably on a **preview or demo environment first**. If clubpulse.co already has real under-18 members, do not
enable it there until every box below is ticked and a person who handles safeguarding at the club has agreed.

- [ ] All Community migrations are run in Supabase: `20261121000001_community.sql`, `20261122000002_community_follows.sql`, `20261122000003_community_moderation.sql`, `20261122000004_community_sessions.sql`
- [ ] `ANTHROPIC_API_KEY` is set. Without it the safety check **holds every post** (it fails closed), so nothing goes live.
- [ ] At least one SHIFTUP staff account has `profiles.role = 'admin'` and can open `/admin/community/reports`
- [ ] Someone has agreed to look at that inbox daily (held posts wait there until a person decides)
- [ ] `COMMUNITY_ENABLED` is set to `true` (no quotes, no spaces). `EXPO_PUBLIC_COMMUNITY_ENABLED` is a separate flag for the phone app and needs a new app build; leave it off for now.

## Smoke test (use fictional accounts, one adult and one junior in different clubs)

1. Adult posts "Great net session tonight" at `/community/feed`. Expected: appears (or "only you can see this" if the AI is slow).
2. Adult posts a phone number or "message me on WhatsApp". Expected: refused with a reason, not stored.
3. A post that was held does **not** show for the other account, and shows in `/admin/community/reports` as Held.
4. Staff clicks Allow. Expected: it now shows for the other account.
5. Other account reports a post. Expected: it shows as Reported; Remove takes it off the feed.
6. Adult tries to open the junior's profile URL directly (no shared club, not staff, not parent). Expected: "Profile not found".
7. Adult tries to follow the junior. Expected: refused.
8. Junior and adult cannot message each other unless the existing rules allow it (see `rules.ts`, `mayMessage`).
9. Block a person. Expected: their posts vanish from your feed and they cannot message you.
10. Adult sets up nets at `/community/near`. A junior account must not see it. A coach sets up a junior session; an adult outside that club must not see it, and a junior at another club cannot join it. A place like "my house" is refused.
11. Linked parent opens `/parent/community`. Expected: sees the child's profile, posts, connections and follows, but no private messages.

If any step fails, stop and switch it off.

## Rollback

1. In Vercel, set `COMMUNITY_ENABLED` to `false` (or delete it) and redeploy. Every Community page shows "not open yet" and every Community API and action refuses.
2. Content is not deleted. Turning it back on restores it.
3. If something harmful was posted, open `/admin/community/reports` first and Remove it, then switch off. Decisions are logged in `community_moderation_events`.

## Known limits

- The phone app has its own flag and is not covered by this checklist.
- Linking a child record to the junior's own account (`child_profiles.linked_user_id`) has no admin screen yet.
- Community links are not in the main menu yet. Add them only when the flag is on.
