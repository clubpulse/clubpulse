import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Refund policy | ClubPulse',
  description: 'When ClubPulse refunds a club subscription or a Scores pack, and how to ask.',
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    heading: 'What can be paid for',
    body: (
      <>
        <p>Only clubs pay ClubPulse, and only on the website. There are two things a club can buy:</p>
        <ul>
          <li><strong>A club subscription</strong>, billed monthly or yearly.</li>
          <li><strong>A Scores pack</strong>, a one-off purchase of Scores for the club to give to its members.</li>
        </ul>
        <p>
          Members never pay ClubPulse. Nothing is sold in the app, and Scores cannot be bought by members. Payments are taken by
          Stripe; we never see or store card numbers.
        </p>
      </>
    ),
  },
  {
    heading: 'Club subscriptions',
    body: (
      <ul>
        <li><strong>Cancel at any time</strong> from Club settings on the website. Your plan runs to the end of the period you have paid for and does not renew.</li>
        <li><strong>First 14 days.</strong> If you cancel within 14 days of first paying for a plan, we will refund that payment in full.</li>
        <li><strong>After 14 days</strong> we do not refund part of a month or year that has already started.</li>
        <li><strong>Renewals.</strong> If a yearly plan renews and you did not mean it to, tell us within 14 days of the renewal and we will refund it and end the plan.</li>
      </ul>
    ),
  },
  {
    heading: 'Scores packs',
    body: (
      <ul>
        <li>A pack can be refunded in full within 14 days of purchase, as long as none of the Scores from that pack have been given to members.</li>
        <li>Once Scores from a pack have started to be given out, the pack cannot be refunded, in whole or in part.</li>
        <li>Scores in a club&apos;s balance are not money and cannot be exchanged for cash, including if the club stops using ClubPulse.</li>
      </ul>
    ),
  },
  {
    heading: 'When we always refund',
    body: (
      <ul>
        <li>You were charged twice for the same thing.</li>
        <li>You were charged the wrong amount.</li>
        <li>You paid for a Scores pack and the Scores did not arrive, and we cannot put that right.</li>
        <li>The service you paid for was unavailable for a long period because of a fault on our side. In that case we refund the share of your plan that you could not use.</li>
      </ul>
    ),
  },
  {
    heading: 'Members, Scores and rewards',
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
          Email {mail} from the address on your ClubPulse account. Tell us your club&apos;s name, what you paid for, the date and the
          amount. A club admin needs to make the request.
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
        Nothing in this policy takes away rights the law gives you. This policy sits alongside our <Link href="/terms">terms of use</Link> and{' '}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund policy"
      updated="18 November 2026"
      intro={<p>This policy explains when ClubPulse gives a refund and how to ask for one. It covers payments made to ClubPulse on the website at clubpulse.co.</p>}
      sections={SECTIONS}
    />
  );
}
