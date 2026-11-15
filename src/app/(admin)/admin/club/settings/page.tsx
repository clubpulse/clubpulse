import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubSettings, getOnboardingChecklist } from '@/lib/admin/club-service';
import { SubscriptionCard } from '@/components/club/SubscriptionCard';
import { StripeConnectCard } from '@/components/club/StripeConnectCard';
import { OnboardingChecklist } from '@/components/club/OnboardingChecklist';
import { ClubProfileForm } from '@/components/club/ClubProfileForm';
import { h1, muted, twoCol } from '@/components/play/ui';

export default async function ClubSettingsPage() {
  const { user, clubId } = await requireClubAdminPage();
  const [settings, checklist] = await Promise.all([
    getClubSettings(user.id, clubId),
    getOnboardingChecklist(user.id, clubId),
  ]);

  if (!settings.success) {
    return (
      <p style={{ fontSize: '14px', color: '#f87171' }}>
        Couldn&apos;t load club settings: {settings.error}
      </p>
    );
  }

  const { club, subscription, stripeAccount, scoresPoolBalance, memberCount } = settings.data;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>⚙️ Club settings</h1>
        <p style={muted}>
          Manage your subscription, Stripe connection, profile, and Scores pool
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
        }}
      >
        {[
          { label: 'Members', value: memberCount },
          {
            label: 'Plan',
            value: subscription?.tier
              ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)
              : 'Free',
          },
          { label: 'Scores pool', value: scoresPoolBalance.toLocaleString() },
          {
            label: 'Stripe',
            value: stripeAccount?.onboarding_complete ? 'Connected' : 'Not set up',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#07102B',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'rgba(255,255,255,0.3)',
                margin: '0 0 6px',
              }}
            >
              {stat.label}
            </p>
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: '20px',
                color: '#fff',
                margin: 0,
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Onboarding checklist */}
      {checklist.success && <OnboardingChecklist steps={checklist.data} />}

      {/* Two-column: subscription + Stripe */}
      <div style={twoCol}>
        <SubscriptionCard clubId={clubId} subscription={subscription} />
        <StripeConnectCard clubId={clubId} stripeAccount={stripeAccount} />
      </div>

      {/* Club profile */}
      <ClubProfileForm clubId={clubId} club={club} />
    </div>
  );
}
