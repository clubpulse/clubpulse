import Link from 'next/link';
import { card, cardTitle, muted } from '@/components/play/ui';

/**
 * Shown in place of a paid feature. Inside the phone app there is no link to the payment page:
 * app stores do not allow an app to send people to pay elsewhere.
 */
export function PlanNeeded({ feature, inApp }: { feature: string; inApp: boolean }) {
  return (
    <div style={{ maxWidth: '560px', margin: '40px auto', fontFamily: "'Inter', sans-serif" }}>
      <div style={card}>
        <p style={cardTitle}>{feature} is part of a paid plan</p>
        <p style={{ ...muted, fontSize: '14px', lineHeight: 1.6 }}>
          It covers analysis on your own phone, coaching, and AI analysis sessions. Scores, rewards, the Academy and your club
          tools stay free.
        </p>
        {inApp ? (
          <p style={{ ...muted, fontSize: '14px', marginTop: '12px' }}>You can manage your plan from your account on the ClubPulse website.</p>
        ) : (
          <Link href="/plan" style={{ display: 'inline-block', marginTop: '16px', background: '#EFC84A', color: '#04091A', fontWeight: 800, fontSize: '14px', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none' }}>
            See plans
          </Link>
        )}
      </div>
    </div>
  );
}
