import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Refund policy',
  description: 'Refunds for individual players, how clubs are covered by their agreement, and how to ask.',
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who this policy is for',
    body: (
      <>
        <p>
          Refunds under this policy are for <strong>individual players and members</strong> who pay SHIFTUP directly for something
          for themselves.
        </p>
        <p>
          <strong>Clubs are different.</strong> A club uses SHIFTUP under a signed agreement for a fixed period. What the club pays,
          for how long, and what happens if it wants to leave early are set out in that agreement, not here. See section 4.
        </p>
        <p>Payments are taken by Stripe. We never see or store card numbers.</p>
      </>
    ),
  },
  {
    heading: 'Refunds for individual players',
    body: (
      <ul>
        <li><strong>First 14 days.</strong> If you change your mind within 14 days of paying, tell us and we will refund the payment in full.</li>
        <li><strong>After 14 days</strong> we do not refund a period that has already started. If what you bought renews, you can cancel at any time and it will not renew again.</li>
        <li><strong>Renewals.</strong> If something renewed and you did not mean it to, tell us within 14 days of the renewal and we will refund it and stop it renewing.</li>
      </ul>
    ),
  },
  {
    heading: 'When we always refund an individual',
    body: (
      <ul>
        <li>You were charged twice for the same thing.</li>
        <li>You were charged the wrong amount.</li>
        <li>You paid and did not receive what you paid for, and we cannot put that right.</li>
        <li>What you paid for was unavailable for a long period because of a fault on our side. In that case we refund the share you could not use.</li>
      </ul>
    ),
  },
  {
    heading: 'Clubs',
    body: (
      <>
        <p>
          A club joins SHIFTUP by signing an agreement for a fixed period. The fees for that period are due as the agreement says.
        </p>
        <ul>
          <li>Fees paid by a club are not refunded under this policy, including if the club stops using SHIFTUP before the agreed period ends.</li>
          <li>Scores bought by a club to give to its members are not refundable and cannot be exchanged for cash.</li>
          <li>If a club is charged twice or charged the wrong amount, we will correct it.</li>
          <li>Anything else about ending early, renewing or changing what a club pays is dealt with in the club&apos;s agreement.</li>
        </ul>
        <p>Clubs with a question about their agreement can email {mail}.</p>
      </>
    ),
  },
  {
    heading: 'Scores and rewards',
    body: (
      <>
        <p>
          Scores that members earn are a thank-you for taking part. They have no cash value, so there is nothing to refund, and they
          cannot be exchanged for money.
        </p>
        <p>
          If you spent Scores on a reward and something went wrong, for example a code that does not work or a reward that was not
          honoured, email {mail}. We will replace the reward or return the Scores to your balance.
        </p>
        <p>Fees you pay to your club, such as membership or match fees, are between you and your club. Ask your club about refunding those.</p>
      </>
    ),
  },
  {
    heading: 'How to ask for a refund',
    body: (
      <>
        <p>
          Email {mail} from the address on your SHIFTUP account. Tell us what you paid for, the date and the amount.
        </p>
        <p>
          We reply within 5 working days. Approved refunds go back to the card or account that paid, and usually arrive within 5 to
          10 working days, depending on your bank.
        </p>
      </>
    ),
  },
  {
    heading: 'Your legal rights',
    body: (
      <p>
        Nothing in this policy takes away rights the law gives you as a consumer. This policy sits alongside our{' '}
        <Link href="/terms">terms of use</Link> and <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund policy"
      updated="18 November 2026"
      intro={<p>This policy explains when SHIFTUP gives a refund and how to ask for one.</p>}
      sections={SECTIONS}
    />
  );
}
