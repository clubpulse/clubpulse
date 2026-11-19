import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy policy | ClubPulse',
  description: 'What ClubPulse collects, why, who it is shared with, and your rights.',
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are',
    body: (
      <>
        <p>
          ClubPulse is an app and website for grassroots cricket clubs and their members. ClubPulse decides how the information
          described here is used, which makes us the data controller for it under UK data protection law.
        </p>
        <p>
          Your club also holds information about you as a member, such as your membership, safeguarding and finance records. For
          those records your club is a controller too, and you can ask your club about them directly.
        </p>
        <p>To ask a question or use any of your rights, email {mail}.</p>
      </>
    ),
  },
  {
    heading: 'What we collect',
    body: (
      <>
        <p><strong>Your account.</strong> Your name, email address, password (stored in scrambled form, never readable by us) and the roles you hold, such as player, parent, coach, volunteer or club admin.</p>
        <p><strong>Your club.</strong> Which club you belong to, your membership status, teams, fixtures, availability, and messages or notices you post.</p>
        <p><strong>Steps.</strong> If you allow it, the app reads your daily step count from Apple Health on iPhone or Health Connect on Android. We store the total for each day. We read steps only. We do not read any other health information, and we never write to Apple Health or Health Connect.</p>
        <p><strong>Scores and rewards.</strong> The Scores you earn and spend, the rewards you claim, and what you earned them for.</p>
        <p><strong>Merchandise orders.</strong> If you order an item with Scores, the name and UK delivery address you give us, and the size you choose. We pass these to the company that makes and posts the item so it can reach you, and use them for nothing else. A junior cannot place an order: a parent or guardian does it for them.</p>
        <p><strong>Games and learning.</strong> Your results in the games, the Academy lessons you complete, and the practice plans made for you.</p>
        <p><strong>Coach AI.</strong> The questions you type to Coach AI and the answers it gives.</p>
        <p><strong>Video analysis.</strong> When you analyse your technique or track a ball, the video is processed on your own device and is not uploaded. We store the results: your scores, measurements and written feedback. If you use the live camera, the three best short clips from the session are uploaded so you can watch them back as highlights.</p>
        <p><strong>Volunteering.</strong> The shifts you sign up for and whether you were checked in. We do not collect your location.</p>
        <p><strong>Coaching.</strong> Sessions you book or offer, and qualifications you record.</p>
        <p><strong>Notifications.</strong> If you allow notifications, an identifier for your phone so we can send them.</p>
        <p><strong>Payments.</strong> If you pay for something on the website, the payment is handled by Stripe. We receive confirmation and the amount. We never see or store your card number.</p>
        <p><strong>Technical information.</strong> Basic details needed to run the service securely, such as sign-in times and error reports.</p>
      </>
    ),
  },
  {
    heading: 'Children',
    body: (
      <>
        <p>
          A child under 13 cannot have their own ClubPulse account. A parent or guardian adds the child from their own account, and
          the club confirms the link before the parent can see anything about the child.
        </p>
        <p>For a child we hold what the parent or the club enters: the child&apos;s name and date of birth, their team, the consents the parent has given or refused (for example for photographs or emergency medical treatment), an emergency contact, and any medical notes the parent chooses to add, such as allergies.</p>
        <p>
          Medical notes and safeguarding records are seen only by the people at the club who need them, such as the welfare officer
          and the child&apos;s coach. They are never used for advertising, rewards or AI features.
        </p>
        <p>A parent can see, correct or withdraw their child&apos;s information and consents at any time in the app, or by emailing {mail}.</p>
      </>
    ),
  },
  {
    heading: 'Why we use it and our legal basis',
    body: (
      <ul>
        <li><strong>To provide the service you signed up for</strong> (contract): your account, club features, Scores, games, lessons, bookings and video analysis.</li>
        <li><strong>With your consent</strong>: reading your step count, notifications, and a child&apos;s medical notes and consents. You can withdraw consent at any time in your phone&apos;s settings or in the app.</li>
        <li><strong>To keep children safe and meet legal duties</strong> (legal obligation and the club&apos;s safeguarding responsibilities): safeguarding records and consent records.</li>
        <li><strong>To run and improve ClubPulse</strong> (legitimate interests): keeping the service secure, fixing faults, preventing misuse of rewards, and understanding which features are used.</li>
      </ul>
    ),
  },
  {
    heading: 'Who we share it with',
    body: (
      <>
        <p>We do not sell your information, and we do not use it for third-party advertising.</p>
        <p>We share it only with:</p>
        <ul>
          <li><strong>Your club.</strong> Club admins, coaches and welfare officers see what they need for their role.</li>
          <li><strong>Companies that run the service for us</strong>, under contract and only on our instructions: Supabase (database, sign-in and file storage), Vercel (website hosting), Anthropic (the AI model behind Coach AI and written feedback), Expo (sending notifications), and Stripe (payments on the website).</li>
          <li><strong>The authorities</strong>, where the law requires it or where it is needed to protect a child or another person from harm.</li>
        </ul>
        <p>
          What you type to Coach AI, summaries of your activity, and the scores from a video analysis are sent to Anthropic to produce
          the reply. One feature, My Sporting Soul, includes your name so the result can address you. Your email address and password
          are never sent. Children&apos;s medical and safeguarding records are never sent to an AI service.
        </p>
        <p>Some of these companies store or process information outside the UK. Where they do, it is protected by the safeguards UK law requires, such as approved standard contract terms.</p>
      </>
    ),
  },
  {
    heading: 'How long we keep it',
    body: (
      <>
        <p>We keep your information while your account is open.</p>
        <p>You can delete your account at any time from the Profile screen in the app. When you do:</p>
        <ul>
          <li>You can no longer sign in, and your email is released.</li>
          <li>Your name, email and notification identifier are wiped from your profile.</li>
          <li>Your step history, roles and club memberships are deleted.</li>
        </ul>
        <p>
          Some records are kept after that, no longer linked to your name on your profile, because they belong to your club or the
          law may require the club to keep them. These include safeguarding records, consent records, finance entries and the
          volunteer shifts you created. Clubs normally keep safeguarding records for as long as national safeguarding guidance
          requires.
        </p>
      </>
    ),
  },
  {
    heading: 'Your rights',
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>see the information we hold about you and get a copy of it;</li>
          <li>have it corrected if it is wrong;</li>
          <li>have it deleted, subject to the records described above;</li>
          <li>object to how we use it, or ask us to limit that use;</li>
          <li>withdraw a consent you have given;</li>
          <li>receive your information in a form you can take elsewhere.</li>
        </ul>
        <p>Email {mail} and we will reply within one month.</p>
        <p>
          If you are unhappy with how we have handled your information, you can complain to the Information Commissioner&apos;s Office
          at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer">ico.org.uk</a>. We would like the chance to put it right first.
        </p>
      </>
    ),
  },
  {
    heading: 'Permissions the app asks for',
    body: (
      <ul>
        <li><strong>Health (steps):</strong> to count your daily steps and reward you with Scores.</li>
        <li><strong>Motion and fitness:</strong> to count steps from the phone itself when Health is not available.</li>
        <li><strong>Camera:</strong> to film your batting or bowling for analysis.</li>
        <li><strong>Microphone:</strong> only if you record a new video with sound to analyse.</li>
        <li><strong>Notifications:</strong> to tell you about fixtures, shifts and rewards.</li>
      </ul>
    ),
  },
  {
    heading: 'Security',
    body: (
      <p>
        Information is encrypted when it travels between your device and our servers, and access is limited by role, so a member
        sees only what their role allows. No system is perfectly secure. If a breach puts you at risk, we will tell you and the ICO
        as the law requires.
      </p>
    ),
  },
  {
    heading: 'Changes to this policy',
    body: (
      <p>
        If we change this policy in a way that matters, we will tell you in the app or by email before the change takes effect. The
        date at the top shows when it was last updated. See also our <Link href="/terms">terms of use</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="19 November 2026"
      intro={<p>This policy explains what ClubPulse collects about you, why, who we share it with, and the rights you have. It covers the ClubPulse app and the website at clubpulse.co.</p>}
      sections={SECTIONS}
    />
  );
}
