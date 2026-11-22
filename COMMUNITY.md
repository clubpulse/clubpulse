# Community: turning it on, and turning it off again

The Community (feed, profiles, connections, follows, messages) is off by default. Nothing in it is live until
`COMMUNITY_ENABLED` is exactly `true` in the Vercel environment. Do not flip it from code or from a pull request.

## Before you turn it on

Preferably on a **preview or demo environment first**. If shift.club already has real under-18 members, do not
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
- Date of birth is collected at sign-up (and asked for once from existing accounts). Under 18 by date of birth, or marked junior by a club admin, makes someone a junior. The date is declared by the person, not proven, so a false date cannot be ruled out; a club admin's junior mark always wins over a date that says 18 or over.
- The Community is closed to anyone with no date of birth, and to any junior with no verified parent linked to their account (shown as "pending"). They see nobody and nobody sees them. The services refuse them as well as the screens (`src/lib/community/age.ts`, `getViewer`, `people`).
- A club admin links a child record to the junior's own account in Safeguarding → Registered children → Community account, and a parent verifies the link.
- Community links are not in the main menu yet. Add them only when the flag is on.

## Junior-to-junior connections
Two juniors connect only after a verified parent of each child has approved. Both children say yes first; the connection then waits (`awaiting_parents`) and every verified parent of both children is asked in Parent Community ("Waiting for your yes"). It opens when each child has at least one approving parent; any parent declining closes it. Nothing can be sent between the two until it opens. A junior with no verified parent is shut out of the Community entirely (see the age gate above), so there is no "no parent" case to connect through. Each step is logged in `community_connection_events` (`sent_to_parents`, `parent_approved`, `parent_declined`, `accepted`). This replaces the briefer rule of notifying parents after the connection, and the earlier one that needed both parents verified before either child could say yes.

## When the AI safety check is unavailable
Posts, comments and messages are held for staff. Nets/pick-up sessions and Short for Saturday games are now held the same way: saved with status `held`, hidden from everyone but staff, and shown in `/admin/community/reports` (Allow releases them, Remove takes them down). A plain rule refusal, such as a phone number or a private address, is still refused and not stored.

## Adult-to-junior contact (parent first)

Off by default and separate from `COMMUNITY_ENABLED`. It needs `COMMUNITY_CROSSBAND_ENABLED` to be exactly `true` as well, and migration `20261122000009`. Leave it off until the club's safeguarding lead has agreed it.

- Only a coach or club admin of a club the young person belongs to can ask, and only with a current enhanced DBS check recorded at that club (Admin → Safeguarding → DBS, status valid, not expired).
- The request goes to the young person's club-verified parent first. The young person is asked only after a parent approves.
- An approved contact is the only way an adult and someone under 18 can message. The parent can read the conversation (read only, each visit is logged) and end it at any time. If the adult's DBS lapses, the thread stops working.
- A parent's "no" blocks the same adult from asking again for 90 days. An adult can have at most 5 requests waiting on a parent.
- Every step is recorded in `community_guardian_events`.
- To switch it off: remove the variable and redeploy. Existing contacts stop working at once.

## Safeguarding controls
- **Private messages are off for under-18s.** Nothing private is read or sent to or from a junior, whatever the connection or parent-approved contact says, until `COMMUNITY_JUNIOR_DMS=true` is set. Do not set it until messages are checked as they are sent and the safeguarding lead agrees. This is a new variable; it is unset by default, so nothing needs changing for it to stay off.
- **Linking a child to an account needs a current enhanced DBS check.** Only a club admin with a valid, unexpired enhanced check recorded at that club (`dbs_checks`) can link a child record to an account, because linking is what makes an account a junior. Any club admin can unlink, which only makes things safer. Named safeguarding training as an alternative to a DBS check is not built.
- **Report a concern** is on every post, comment, profile and private message, with a "call 999 if a child is in immediate danger" prompt, and a note at the foot of every Community page. Reports land in the review queue at `/admin/community/reports`. Sessions and games cannot be reported yet.
- **A named safeguarding lead owns the review queue.** The software cannot hold that role. Until one is appointed it is the founder. Suggested: urgent items within an hour, everything else within 24 hours; club concerns to the club welfare officer then the ECB safeguarding team; concerns about an adult who works with children to the LADO; a child in immediate danger to the police; sexual images of children to the Internet Watch Foundation; grooming to CEOP.
