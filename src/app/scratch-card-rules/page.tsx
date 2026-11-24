import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Scratch card rules | SHIFTUP',
  description: 'The official rules for SHIFTUP scratch cards: who can take part, how cards are earned, and how prizes are decided.',
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

// Keep in step with expo/app/scratch-rules.tsx, which shows the same rules inside the app.
const SECTIONS: LegalSection[] = [
  {
    heading: 'Who runs it',
    body: (
      <>
        <p>SHIFTUP scratch cards are a free prize draw run by SHIFTUP. You can reach us at {mail}.</p>
        <p>
          <strong>Apple is not a sponsor of this prize draw and is not involved in it in any way.</strong> The same is true of Google.
          No prize is an Apple or Google product.
        </p>
      </>
    ),
  },
  {
    heading: 'Who can take part',
    body: (
      <ul>
        <li>You must be aged 18 or over and live in the United Kingdom.</li>
        <li>You need a SHIFTUP account that belongs to a club which has scratch cards switched on.</li>
        <li>Junior accounts cannot receive or open scratch cards.</li>
        <li>One account per person.</li>
      </ul>
    ),
  },
  {
    heading: 'It is free',
    body: (
      <p>
        Scratch cards cannot be bought. A card costs no money and no Scores, and nothing you buy improves your chance of a prize.
      </p>
    ),
  },
  {
    heading: 'How you get a card',
    body: (
      <ul>
        <li>Check in on seven days in a row: the seventh day gives you a card.</li>
        <li>Complete tasks your club has chosen to reward, such as Academy lessons or video analysis. Your club sets how many it takes, and there is a weekly limit.</li>
        <li>Take part in a game that awards a card, where one is running.</li>
        <li>Reach a Scores milestone, where your club has set one.</li>
        <li>Your club awards you a card.</li>
      </ul>
    ),
  },
  {
    heading: 'How prizes are decided',
    body: (
      <>
        <p>
          When you open a card, our server picks its result at random. Each possible result, and its chance, is shown on the Scratch
          cards screen before you open a card. The chances are set by your club and are the same for every member of that club.
        </p>
        <p>The result is not affected by skill, by how or when you scratch, or by cards you opened before.</p>
      </>
    ),
  },
  {
    heading: 'The prizes',
    body: (
      <ul>
        <li><strong>Scores</strong> are added to your balance straight away.</li>
        <li><strong>Gift cards</strong> are sent to the email address on your account, normally within 14 days.</li>
        <li><strong>Club rewards</strong> are provided by your club and are claimed at the club.</li>
        <li>Some cards hold no prize.</li>
      </ul>
    ),
  },
  {
    heading: 'Limits',
    body: (
      <ul>
        <li>Prizes cannot be swapped for cash and cannot be passed to someone else.</li>
        <li>If a prize becomes unavailable we will replace it with one of equal or greater value.</li>
        <li>We may cancel cards and prizes obtained by cheating, by using more than one account, or by breaking our <Link href="/terms">terms</Link>.</li>
      </ul>
    ),
  },
  {
    heading: 'Your information',
    body: (
      <p>
        We use your account details to record the cards you earn and to send your prize. See our <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
  {
    heading: 'Changes and questions',
    body: (
      <>
        <p>
          We may change these rules or end scratch cards. If we do, a card you have already earned can still be opened under the rules
          that applied when you earned it.
        </p>
        <p>These rules are governed by the law of England and Wales. Questions and complaints: {mail}.</p>
      </>
    ),
  },
];

export default function ScratchCardRulesPage() {
  return (
    <LegalPage
      title="Scratch card rules"
      updated="18 November 2026"
      intro={<p>These are the official rules for scratch cards in the SHIFTUP app and on the website.</p>}
      sections={SECTIONS}
    />
  );
}
