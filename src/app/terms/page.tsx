import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of use | ClubPulse',
  description: 'The terms for using the ClubPulse app and website.',
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    heading: 'Using ClubPulse',
    body: (
      <>
        <p>ClubPulse is for grassroots cricket clubs and their members. By creating an account or using the app or website, you agree to these terms.</p>
        <p>You must be 13 or over to have your own account. Children under 13 are added by a parent or guardian from the parent&apos;s account.</p>
        <p>Keep your sign-in details to yourself, give accurate information, and tell us at {mail} if you think someone else has used your account.</p>
      </>
    ),
  },
  {
    heading: 'Scores and rewards',
    body: (
      <>
        <p>
          Clubs use ClubPulse under a signed agreement for a fixed period, and what a club pays is set out in that agreement. Our{' '}
          <Link href="/refunds">refund policy</Link> covers payments made by individual players.
        </p>
        <p>Scores are earned by taking part: walking, checking in, volunteering, learning, playing the games and other club activity. They are a thank-you for taking part.</p>
        <ul>
          <li>Scores are not money. They have no cash value, cannot be bought, sold or transferred, and cannot be exchanged for cash.</li>
          <li>Rewards are subject to availability and to any conditions shown with the reward.</li>
          <li>We may adjust how Scores are earned, set limits, or correct a balance where Scores were given in error.</li>
          <li>Scores gained by cheating, such as faked steps or automated play, may be removed, and the account may be closed.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Games',
    body: (
      <p>
        The games are free to play and are for entertainment. Nothing is staked and nothing can be lost. Player names in the games
        are used to describe real cricketers. ClubPulse is not affiliated with, sponsored by or endorsed by any player, team, league
        or governing body, and the points given to players in the games are our own estimates.
      </p>
    ),
  },
  {
    heading: 'Coaching, video analysis and Coach AI',
    body: (
      <>
        <p>
          The Academy lessons, practice plans, technique scores, ball tracking and Coach AI replies are general guidance to help you
          improve. They are produced by software, from a single camera or from what you type, and they can be wrong.
        </p>
        <ul>
          <li>They are not a substitute for a qualified coach who can see you in person.</li>
          <li>They are not medical advice. If you are injured or in pain, stop and see a doctor or physiotherapist.</li>
          <li>Speed, technique scores and the bowling arm reference check are estimates. The arm check is not a ruling on whether a bowling action is legal.</li>
          <li>Warm up, use suitable protective equipment, and make sure the space around you is safe before you practise or film.</li>
          <li>Only film other people, and especially children, with permission from them or their parent, and in line with your club&apos;s photography policy.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'How you must behave',
    body: (
      <>
        <p>Do not use ClubPulse to:</p>
        <ul>
          <li>bully, harass, threaten or discriminate against anyone;</li>
          <li>post anything unlawful, abusive, sexual or harmful to children;</li>
          <li>share someone else&apos;s private information without their permission;</li>
          <li>get into accounts or information that are not yours, or disrupt the service.</li>
        </ul>
        <p>If you have a concern about a child&apos;s safety, tell your club&apos;s welfare officer. If a child is in immediate danger, call 999.</p>
      </>
    ),
  },
  {
    heading: 'Your content',
    body: (
      <p>
        You keep ownership of what you upload or post, such as highlight clips and messages. You give us permission to store and show
        it as needed to run the service for you and your club. You are responsible for having the right to share it.
      </p>
    ),
  },
  {
    heading: 'Your club',
    body: (
      <p>
        Your club decides who its members are, what its fees are and how it runs its teams, sessions and volunteering. Those matters
        are between you and your club. ClubPulse provides the tools the club uses.
      </p>
    ),
  },
  {
    heading: 'Closing your account',
    body: (
      <p>
        You can delete your account at any time from the Profile screen in the app. We may suspend or close an account that breaks
        these terms. Any unused Scores are lost when an account is closed. Our <Link href="/privacy">privacy policy</Link> explains
        what happens to your information.
      </p>
    ),
  },
  {
    heading: 'Our responsibility to you',
    body: (
      <>
        <p>We work to keep ClubPulse running well, but we provide it as it is and cannot promise it will always be available or free of faults.</p>
        <p>
          Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for
          anything else that cannot be limited by law. Nothing here affects your legal rights as a consumer.
        </p>
        <p>Beyond that, we are not responsible for losses that we could not reasonably have foreseen, or for losses caused by events outside our control.</p>
      </>
    ),
  },
  {
    heading: 'Changes and the law that applies',
    body: (
      <>
        <p>We may update these terms. If a change matters, we will tell you in the app or by email before it takes effect.</p>
        <p>These terms are governed by the law of England and Wales. If you live in Scotland or Northern Ireland, you can also bring a claim in your local courts.</p>
        <p>Questions: {mail}.</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="18 November 2026"
      intro={<p>These are the terms for using the ClubPulse app and the website at clubpulse.co. Please read them with our <Link href="/privacy">privacy policy</Link>.</p>}
      sections={SECTIONS}
    />
  );
}
