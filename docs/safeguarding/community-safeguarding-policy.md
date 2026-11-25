# SHIFTUP Community: Online Safeguarding Policy

**DRAFT v0.2 – 22 November 2026.** Not approved. An independent, suitably qualified safeguarding person must review it before any junior (under-18) is invited to SHIFTUP Community.

| | |
|---|---|
| Policy owner | Ishwar Suresh, Co-founder and Safeguarding Lead |
| Deputy Safeguarding Lead | **[NEEDS ISHWAR: deputy safeguarding lead name]** |
| Independent reviewer | **[NEEDS ISHWAR: independent reviewer name and qualification]**, review date **[NEEDS ISHWAR: independent review date]** |
| Next review | Within 12 months of approval, or sooner after a serious incident. **[NEEDS ISHWAR: the approval date this is counted from]** |

Items marked **[NEEDS ISHWAR: …]** need a fact only Ishwar can supply. Items marked **[VERIFY: …]** are statements about the platform that must be checked as true on the day of approval.

> **Remove this box before approval. What changed in v0.2 and what must be true first.**
> v0.1 described some controls as if they were live. They are built but, as of 22 November 2026, **not all are merged or applied to production**. This policy describes the controls as they will be once the pull requests below are merged and their database migrations applied. Before approval, the Safeguarding Lead confirms each row.
>
> | Control | Where it is built | State on 22 Nov 2026 |
> |---|---|---|
> | Parent verified only by a club admin with a current enhanced DBS; parent must be 18+ and not marked junior; safeguarding tables writable by the server only | PR #166 and #167, migration 020 | Open, not merged or applied |
> | Reporting sessions and games; named DBS-checked adult for each junior session; edit timestamps | PR #167, migrations 021–023 | Open, not merged or applied |
> | Session age band locked once anyone has signed up | PR #169, migration 024 | Merged; migration not applied |
> | Alerts to the lead and deputy | PR #170, migration 025 | Open, not merged or applied |
> | Under-18s switch (`COMMUNITY_JUNIORS_ENABLED`, off by default) | PR #171 | Open, not merged |
> | Club-confirmed date of birth (`DOB_CONFIRMATION_REQUIRED`) | PR #172, migration 026 | Open, not merged or applied |
> | Parent approvals in the app | PR #173 | Open, not merged; app screen not tested on a device |
>
> Also to do before approval: set the lead and deputy in `safeguarding_contacts`; set `RESEND_API_KEY` and `CRON_SECRET` in production and schedule the alert retry (section 4); record the Lead's DBS as valid once the Deputy has seen the original certificate; confirm with the ECB or county board that the Lead's DBS is accepted.

## 1. Purpose, scope and commitment

SHIFTUP is a UK cricket club platform. Its Community feature lets members use a feed, posts, comments, connections, direct messages, nets and pickup sessions, and games where a club is looking for players. Members include adults and juniors (under 18). This policy sets out how SHIFTUP keeps children and adults at risk safe online, and what everyone involved must do when there is a concern.

**Scope.** This policy applies to everyone at SHIFTUP, including founders, staff, contractors and volunteers. It also applies to club admins and club welfare officers when they use SHIFTUP, and to all Community content and features. It sits alongside each club's own safeguarding policy, not in place of it.

**Our commitment.** We follow these principles:

- The welfare of the child is paramount. This is the core principle of the Children Act 1989 and the Children Act 2004.
- Safeguarding is everyone's responsibility. Concerns are shared promptly with the right people, as set out in the statutory guidance *Working Together to Safeguard Children*.
- We follow the ECB's Safe Hands safeguarding policy and guidance for cricket. Club-related concerns are routed through club welfare officers, county safeguarding officers and the ECB.
- We aim to reduce the risk of illegal and harmful content, protect children from harmful content and contact, provide easy reporting, and act on reports. We are taking legal advice on how the Online Safety Act 2023 and the ICO's Children's Code apply to SHIFTUP. This policy is not itself a statement of compliance with them. **[NEEDS ISHWAR: whether legal advice on the Online Safety Act and the Children's Code has been taken, by whom, and the date]**
- All children have an equal right to protection, whatever their age, disability, gender, race, religion or belief, sex or sexual orientation.
- When we are unsure, we act. If in doubt, we hold the content, record it and escalate.

## 2. Roles and responsibilities

| Role | Who | Responsibilities |
|---|---|---|
| Safeguarding Lead | Ishwar Suresh (ECB Safeguarding Level 2; enhanced DBS issued February 2026) | Owns this policy. Receives and decides concerns. Makes referrals. Keeps records. Gives written sign-off for any change to the switched-off features (section 7). Makes sure the response times are met. |
| Deputy Safeguarding Lead | **[NEEDS ISHWAR: deputy safeguarding lead name]** (**[NEEDS ISHWAR: deputy qualification and DBS details]**) | Covers when the Lead is unavailable. Receives every alert the Lead receives. Decides any concern that involves the Lead, or the SHIFTUP project or company itself, without the Lead's involvement. |
| Club admins | Named per club | Must hold a current enhanced DBS at their club to verify parents or link child records. Confirm juniors' dates of birth. Mark juniors. Pass concerns to the club welfare officer and SHIFTUP. |
| Club welfare officers | Named per club | The club's safeguarding contact under Safe Hands. Receive club-related concerns and escalate to the county safeguarding officer. |
| Human moderators | **[NEEDS ISHWAR: moderator names and roles. None are appointed in the product today.]** | Review held content. Remove or allow it. Escalate to the Lead. Only a person can release held content. |
| Automated moderation tools | Platform systems | Check and HOLD content. They support people but never make final decisions. They never delete content and cannot release it. |

## 3. What counts as a concern

A concern is anything that suggests a child or adult at risk may be harmed, may be at risk of harm, or may be harming someone else. It also includes any breach of this policy. Concerns include:

- **Sexual abuse and exploitation:** sexual content involving a minor, or any sexual content or contact aimed at a child.
- **Online grooming:** an adult trying to build a private or special relationship with a child (see signs below).
- **Abuse and harassment:** harassment, bullying, threats, hate or discriminatory abuse.
- **Self-harm:** self-harm or suicide content, especially content that encourages it.
- **Personal data and location:** sharing addresses, phone numbers, school names or images without consent. Meeting at private locations.
- **Scams and deception:** scams, fraud, impersonation or fake profiles, including someone giving a false age.
- **Offline harm disclosed online:** neglect, emotional abuse, or physical abuse that is disclosed or suspected, including disclosures made online about life away from cricket.
- **Adults in positions of trust:** concerns about the behaviour of staff, volunteers, coaches or club admins (see section 8).

**Signs of online grooming**

- Excessive attention, flattery or gifts. Making a child feel special or 'more mature'.
- Trying to move contact to private channels, other apps, or offline meetings away from club settings.
- Asking for secrecy ("don't tell your parents"), or trying to come between a child and their parents or coach.
- Asking for personal details, photos, location, or what school the child goes to.
- Sexual talk, 'jokes' or testing boundaries, gradually getting more personal.
- Offers of extra coaching, selection, lifts or kit outside normal club arrangements.
- An adult using a false age, or a profile that seems built to appeal to juniors.
- Repeated attempts to get around platform controls, such as asking a junior to accept a connection or message elsewhere.

## 4. Alerts and response times

**How the Lead and Deputy are told.** When a report is filed, or the safety check holds a post, comment, private message, session or game, the platform emails the Safeguarding Lead and the Deputy straight away, and sends an app push notification where they have one. The message gives the type of item, whether it involves a junior, the reason, and a link to the moderation queue. It never contains the reported content. For a junior item it also leaves out what the reporter wrote. Each alert and each delivery is logged with the time it was sent. If sending fails it is retried (after 1, 2, 4, 8 and then 15 minutes, up to 10 attempts). The moderation queue shows a warning if no Lead or Deputy is set up to be alerted, or if any alert has failed. **[VERIFY: the retry sweep (`/api/cron/safeguarding-alerts`) is scheduled every minute, `CRON_SECRET` and `RESEND_API_KEY` are set in production, and a test report reaches both the Lead and the Deputy.]**

An alert is a prompt to act, not a response. Response times must be realistic, and they are reviewed (section 10). We will only commit to times that the Lead and Deputy can actually meet. 'Response' means a named person has read the concern, made sure the content is held, and started action.

| Type of concern | Response target |
|---|---|
| **URGENT:** risk to a child, sexual content involving a minor, grooming, threats | Within 1 hour, at any time. If someone is in immediate danger, call 999 first. |
| All other concerns | **[NEEDS ISHWAR: response time for concerns that are not urgent. Do not publish a time that cannot be met.]** |
| Review of the held content queue | **[NEEDS ISHWAR: how often the held-content queue is reviewed]** |
| Cover when the Lead is unavailable | Deputy Safeguarding Lead. Cover arrangements: **[NEEDS ISHWAR: cover rota when the lead is unavailable]** |

If a target is missed, record why. The Lead reviews missed targets monthly. If urgent concerns cannot be covered reliably, the under-18s switch (section 7) must be turned off until they can be.

## 5. Escalation route

Follow this order. More than one route may apply. For example, grooming by a coach would go to the police or CEOP, the club welfare officer, the county safeguarding officer and the LADO.

| # | Who | When | Contact |
|---|---|---|---|
| 1 | 999 / police | Immediate danger to anyone, or a crime in progress. Use 101 for non-emergency police. | 999 / 101 |
| 2 | Club welfare officer | Any concern about a member, session or game linked to a club. | **[NEEDS ISHWAR: each club's welfare officer contact]** |
| 3 | County safeguarding officer | Club-related concerns needing county involvement, or if the club welfare officer is unavailable or implicated. | **[NEEDS ISHWAR: county cricket board and its safeguarding officer contact]** |
| 4 | ECB / Cricket Regulator safeguarding team | Serious or cross-club concerns, or if the county is unavailable or implicated. | safeguarding@cricketregulator.co.uk, 020 7432 1200, as published at https://www.ecb.co.uk/about/policies/safeguarding |
| 5 | Local authority designated officer (LADO) | Allegations against adults who work or volunteer with children (section 8). Use the LADO for the child's local area. | **[NEEDS ISHWAR: LADO contact for each local authority a child may live in]** |
| – | CEOP (National Crime Agency's child protection command) | Online grooming or online sexual abuse of a child. | https://www.ceop.police.uk/ceop-reporting/ |
| – | Internet Watch Foundation (IWF) | Sexual images or videos of children. NEVER download, screenshot, share or forward such images. Hold the content and report it. | https://report.iwf.org.uk/ |
| – | NSPCC helpline | Advice for anyone unsure what to do. | 0808 800 5000, https://www.nspcc.org.uk/keeping-children-safe/reporting-abuse/ |

If a child is at risk, do not wait for consent before referring. Do not investigate yourself. Do not contact the alleged abuser or warn them.

## 6. Recording concerns

- Content linked to a concern is HELD (hidden from view), never deleted, so that evidence is kept. Do not copy, forward or download illegal images (see IWF above).
- Every concern is recorded in the community reports and moderation log. Serious club-related cases are also recorded in the safeguarding incident log.
- Record the facts, not opinions. Include who reported it, the date and time, what was seen or said (using the person's own words where possible), the content and accounts involved, the actions taken and by whom, referrals made (with reference numbers), and decisions with reasons.
- Records are confidential and shared only on a need-to-know basis with those named in section 5, or as the law requires.
- Records are handled under UK GDPR and the Data Protection Act 2018. Safeguarding can be a lawful reason to share information without consent. Retention period: **[NEEDS ISHWAR: how long safeguarding records are kept]**. Access is limited to the Safeguarding Lead, the Deputy, and the server process that sends alerts. **[NEEDS ISHWAR: anyone else who should have access]**.

## 7. Platform safeguards

These are the controls SHIFTUP Community uses to reduce risk. They support people's judgement but do not replace it. See the box at the top for which are live.

- **Age and status.** Everyone gives a date of birth. A date of birth is declared, not proof of age. Under-18s, and anyone a club admin marks as junior, are treated as juniors. Juniors without a verified parent, and anyone with no date of birth, are hidden and cannot take part.
- **Club-confirmed date of birth.** A club admin can confirm a junior member's date of birth after checking it against what the club holds. Once `DOB_CONFIRMATION_REQUIRED` is on, a junior cannot use Community until a club admin has confirmed it. The Lead turns this on before any junior is invited. **[VERIFY: switched on]**
- **How juniors come in.** Juniors are brought in by their club. A junior who signs up on their own can do nothing in Community: they stay shut out, and nobody sees them, until a club admin has linked their account to a child record and a verified parent is linked. Open junior sign-up does not exist.
- **Parent verification.** A parent can be verified only by a club admin with a current enhanced DBS at that club. The parent's date of birth must show they are 18 or over, and they must not be marked as junior. A club admin needs a current enhanced DBS to link a child record. These records can be changed only by the platform's server, not directly by a signed-in user.
- **Junior-to-junior connections.** Both juniors must accept. The connection then waits, and every verified parent of both children is asked. It opens only when a verified parent of each child has approved. Any one parent declining closes it. Nothing can be sent between the two until it opens. Every decision is logged. Parents can answer on the website or in the app.
- **Adult-to-junior contact (OFF).** An adult's request to contact a junior goes to the junior's verified parent first. The junior is asked only after the parent approves, and a parent can end it at any time. This feature is OFF.
- **Direct messages to or from under-18s (OFF).** This feature is OFF.
- **Under-18s switch.** Under-18s can use Community only while `COMMUNITY_JUNIORS_ENABLED` is on. It is off unless set to exactly `true`. While it is off, juniors are shut out, nobody sees them or their words, junior sessions are hidden and cannot be created or joined, and junior connections and parent approvals are closed. Adults are not affected.
- **Sessions.** A junior session needs a named adult from the club with a current enhanced DBS. If their DBS lapses, the session is hidden and cannot be joined. Juniors cannot see or join adult sessions. A session's age band cannot be changed once anyone has signed up. Sessions refuse private locations (for example 'my house') and phone numbers.
- **Moderation.** An automated check reviews posts, comments, messages, sessions and games when they are submitted. Anything it cannot clear is HELD for a person to review. The check never deletes anything. Only a person can release held content or decide to remove it.
- **Reporting.** A 'Report a concern' button appears on content, profiles, sessions and games, with a prompt to call 999 if someone is in immediate danger. Reports and held items alert the Lead and Deputy (section 4).
- **Edit history.** Posts, comments and messages record when they were last edited, so that a change after a report or a scan can be seen.
- **Privacy.** Signed-out visitors cannot see profiles or Community content. **[VERIFY: tested while signed out]**

### Change-control rule for the switched-off features

Adult-to-junior contact, direct messages to or from under-18s, and the under-18s switch itself must stay OFF until the Safeguarding Lead has given **written sign-off**.

- Turning `COMMUNITY_JUNIOR_DMS` or `COMMUNITY_CROSSBAND_ENABLED` on needs written sign-off from the Safeguarding Lead. Turning `COMMUNITY_JUNIORS_ENABLED` on needs the same sign-off, and so does turning on any new feature that lets an adult reach a junior.
- The sign-off must be based on a documented risk assessment and recorded with its date.
- A change involving the Lead's own conflict of interest is decided by the Deputy.
- Until this policy has been independently reviewed, none of them will be turned on.
- The settings are environment variables, so a person with access to the hosting account could change them. **[NEEDS ISHWAR: who can change production environment variables, and how a change is recorded and checked]**
- Any change to the safeguards above must be reviewed by the Lead before release.

## 8. Allegations against staff, volunteers or club admins

- Any allegation that someone working or volunteering with children has harmed a child, may have committed an offence against a child, or has behaved in a way that suggests they may be unsuitable must be reported to the Safeguarding Lead straight away. The Lead refers it to the LADO within one working day, and informs the club welfare officer, the county safeguarding officer and the ECB where cricket is involved.
- If the allegation involves the Lead or the SHIFTUP project or company, it goes to the Deputy, who handles it independently.
- While the matter is looked at, the person's admin, verification and session-leading permissions may be suspended. This is a neutral act and not a finding of guilt. Their content is held, not deleted.
- Do not investigate, interview the child, or tell the person about the allegation unless the LADO or police advise you to.
- Keep a full record (section 6). Where the legal threshold is met, refer to the Disclosure and Barring Service (DBS).

## 9. Training and DBS requirements

| Role | Training | DBS |
|---|---|---|
| Safeguarding Lead and Deputy | ECB Safeguarding Level 2 (or equivalent), refreshed **[NEEDS ISHWAR: how often the lead and deputy refresh ECB safeguarding training]** | Enhanced DBS with Children's Barred List check, renewed **[NEEDS ISHWAR: how often the enhanced DBS is renewed]** |
| Human moderators | **[NEEDS ISHWAR: moderator training requirement]** plus training on this policy | **[NEEDS ISHWAR: moderator DBS requirement]** |
| Club admins who verify parents or link children | Club safeguarding training under Safe Hands, plus a briefing on this policy | Current enhanced DBS at that club (enforced by the platform) |
| Named adults for junior sessions | As required by the club and the ECB | Current enhanced DBS at that club (enforced by the platform) |

The platform checks DBS status when a session is created, shown or joined, and when a parent is verified or a child is linked. A lapsed DBS removes the related permissions until it is renewed. The platform records a DBS check only as a date and status held by the club; it does not see the certificate. The Lead's own DBS is recorded as valid only after the Deputy has seen the original certificate.

## 10. Review

- This policy will be reviewed by within 12 months of approval. **[NEEDS ISHWAR: the approval date]**, or sooner after any serious incident, a change in law or ECB guidance, or a change to the platform safeguards.
- An independent, suitably qualified safeguarding person outside the SHIFTUP project must review it before any junior is invited. Their name, date and comments will be recorded here. **[NEEDS ISHWAR: independent reviewer name, qualification, date and comments]**
- Response times (section 4) are reviewed at every policy review, and at any time they are not being met.

| Version | Date | Change | Approved by |
|---|---|---|---|
| 0.1 DRAFT | 22 November 2026 | First draft for review | Not yet approved |
| 0.2 DRAFT | 22 November 2026 | Parent-approval wording matched to the built flow; joining rule corrected; change-control rule reworded; hourly-scan claim removed; alerts described; online-safety wording softened; build-status box added; placeholders marked | Not yet approved |

## Appendix: What to do if you have a concern

| Step | What to do |
|---|---|
| 1. Is anyone in immediate danger? | YES: call 999 now, then tell the Safeguarding Lead. NO: go to step 2. |
| 2. Report it | Use 'Report a concern' on the post, comment, profile, session or game, or email hello@shiftup.club, marked for the Safeguarding Lead. **[NEEDS ISHWAR: a dedicated safeguarding address if hello@shiftup.club is not the one to use]** |
| 3. Hold, don't delete | Moderators HOLD the content. Never delete it, and never download, screenshot, share or forward sexual images of children. |
| 4. Is it urgent? | Risk to a child, sexual content involving a minor, grooming or threats: the Lead or Deputy responds within 1 hour. Other concerns: **[NEEDS ISHWAR: response time for concerns that are not urgent]**. |
| 5. Does it involve the Lead or SHIFTUP? | YES: send it to the Deputy Safeguarding Lead. **[NEEDS ISHWAR: deputy name and contact]** |
| 6. Escalate | Club welfare officer, then the **[NEEDS ISHWAR: county cricket board, which depends on the club]** county safeguarding officer, then the ECB safeguarding team. Allegation against an adult working with children: LADO. Online grooming or sexual abuse: CEOP. Sexual images of children: IWF. Need advice: NSPCC helpline. |
| 7. Record it | Log the facts, times, actions and decisions in the community reports and moderation log, and in the safeguarding incident log if the case is serious and club-related. |
| 8. Follow up | Check that actions are done, the child is safe, and lessons are fed into the next review. |

**Do:** listen, stay calm, take it seriously, write down the facts, and act quickly.

**Don't:** promise to keep secrets, investigate yourself, confront the alleged abuser, or delete or share evidence.
