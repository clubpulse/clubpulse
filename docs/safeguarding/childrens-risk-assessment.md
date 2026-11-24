# SHIFTUP: children's risk assessment (draft)

**Status: draft. Not an Online Safety Act compliance statement.** Community is switched off. This assessment describes the service as it is built, including features that are not open.

Prepared for the Safeguarding Lead, Ishwar Suresh, and the co-founder Harinarayanan J. It follows the questions a children's risk assessment has to answer under the Online Safety Act 2023 for a service likely to be accessed by children. It is not legal advice.

**[NEEDS ISHWAR: confirm whether SHIFTUP is in scope as a user-to-user service once Community opens, and the date legal advice was taken.]**

## 1. The service

SHIFTUP is a cricket platform for clubs and players. A child can create an account. The date of birth is typed by the person signing up. It is not checked against a document.

Community (feed, messages, connections, sessions and games) is switched off until `COMMUNITY_ENABLED` is set. Paid scratch cards and raffles are switched off. Player video for technique analysis stays on the device; saved highlight clips go to a private storage bucket.

## 2. How a child can access it

| Path | What we know | What we do not know |
|---|---|---|
| Typed date of birth | The server calculates age from the saved date. Under 18s need a linked parent before Community would open. Under 13s also need a guardian email confirmation. | A child can type an adult date. No vendor checks the date or the guardian's identity. |
| Club admin mark | A club can mark a member as a junior. That mark wins over a date that says 18 or over. | **[NEEDS ISHWAR: which clubs, if any, are being contacted, and who at the club confirms ages.]** |
| Community off | The public site and the app do not open the community feed while the flag is false. | A person with production access could turn the flag on. **[NEEDS ISHWAR: who can change production environment variables.]** |

## 3. Harm the service could cause

These are the harms to consider for children. Likelihood is judged with Community off, then again if it were opened without the controls below.

| Harm | With Community off | If Community were opened |
|---|---|---|
| Contact from an adult, including grooming | Low. There is no member-to-member feed or direct message. | Higher. Messages and connections exist in the product. A typed age can be false. |
| Harmful or illegal content posted by users | Low. Members cannot post to the community feed. | Higher. Posts, comments and images would be user-generated. Automated checks can hold an item. Only a person can release it. **[NEEDS ISHWAR: who that person is, and how quickly they review the queue.]** |
| Sexual images of children | Low while posting is closed. | Must be held, not downloaded or forwarded, and reported to the Internet Watch Foundation at https://report.iwf.org.uk/ and to CEOP at https://www.ceop.police.uk/ceop-reporting/. |
| Bullying and harassment | Low on the closed feed. Club tools still show names to people in the same club. | Higher inside a club and across clubs. |
| Data and location | A profile can hold a name and a date of birth. Highlight video is private to the owner. | Sessions can name a place. **[NEEDS ISHWAR: whether a junior session may publish a ground address.]** |
| Commercial pressure and gambling-style features | Paid scratch cards and raffle ticket sales are switched off. | They must stay off until a Gambling Act review and age verification. Earned scratch cards still exist for accounts the product treats as adult. |

## 4. Controls already in the product

- Community flag defaults off on the website and in the app.
- Under 18s are not cleared for Community without a verified parent link.
- Under 13s are not cleared until a guardian confirms by email. The email proves the address was reached. It does not prove the sender is the parent or that the date of birth is true.
- Safeguarding alerts retry through `/api/cron/safeguarding-alerts`, which refuses a request that is not `Authorization: Bearer` plus `CRON_SECRET`.
- Reporting and holding content is built. Releasing held content is a person, not the automated check.

## 5. What still needs a vendor or a decision

A vendor is needed for any of these. This assessment does not pick one.

- Checking a date of birth against a document, a credit file, or a database.
- Checking that the person who confirms is the parent or guardian.
- Estimating age from a face or a video.
- Scanning images for known child sexual abuse material at upload, if Community images open.

**[NEEDS ISHWAR: which of those, if any, to buy, and the budget.]**

**[NEEDS ISHWAR: the response time for a non-urgent concern. The draft policy does not set one.]**

**[NEEDS ISHWAR: deputy safeguarding lead, moderators, and the independent reviewer.]**

## 6. Review

Review this assessment before Community is switched on, and again within 12 months of that decision. **[NEEDS ISHWAR: the date of the decision.]**
