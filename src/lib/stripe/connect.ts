/**
 * Stripe Connect helpers for club onboarding.
 *
 * Each club gets a Standard Connect account (dashboard-hosted, full KYC managed by Stripe).
 * We use destination charges with a 5% application_fee_amount.
 */

import { getStripe } from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ClubStripeAccount } from '@/lib/types/subscription';

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shiftup.club';

/**
 * Create a Stripe Connect account for a club and return the onboarding URL.
 * Idempotent — if the club already has an account, returns a new account link.
 */
export async function createConnectAccount(
  clubId: string,
  clubName: string,
  adminEmail: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripe = getStripe();
  const admin = createAdminClient();

  // Check if club already has a Stripe account
  const { data: existing } = await admin
    .from('club_stripe_accounts')
    .select('stripe_account_id, onboarding_complete')
    .eq('club_id', clubId)
    .maybeSingle();

  let accountId: string;

  if (existing?.stripe_account_id) {
    accountId = existing.stripe_account_id;
  } else {
    // Create new Standard Connect account
    const account = await stripe.accounts.create({
      type: 'standard',
      country: 'GB',
      email: adminEmail,
      business_type: 'non_profit',
      metadata: {
        club_id: clubId,
        club_name: clubName,
        platform: 'shiftup',
      },
      business_profile: {
        name: clubName,
        mcc: '7941', // Sports clubs
        url: `${PLATFORM_URL}/club/${clubId}`,
      },
    });

    accountId = account.id;

    // Store in DB
    await admin.from('club_stripe_accounts').upsert(
      {
        club_id: clubId,
        stripe_account_id: accountId,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      },
      { onConflict: 'club_id' },
    );
  }

  // Generate account link for onboarding / re-onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${PLATFORM_URL}/admin/club/settings?stripe=refresh`,
    return_url: `${PLATFORM_URL}/admin/club/settings?stripe=complete`,
    type: 'account_onboarding',
  });

  return { accountId, onboardingUrl: accountLink.url };
}

/**
 * Refresh a Connect account's status from Stripe and update the DB.
 */
export async function refreshConnectStatus(clubId: string): Promise<ClubStripeAccount | null> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const { data: row } = await admin
    .from('club_stripe_accounts')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();

  if (!row) return null;

  const account = await stripe.accounts.retrieve(row.stripe_account_id);

  const updated = {
    onboarding_complete: account.details_submitted ?? false,
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
  };

  const { data } = await admin
    .from('club_stripe_accounts')
    .update(updated)
    .eq('club_id', clubId)
    .select('*')
    .maybeSingle();

  return data as ClubStripeAccount | null;
}

/**
 * Get the Stripe dashboard login link for a connected account.
 */
export async function getConnectDashboardLink(stripeAccountId: string): Promise<string> {
  const link = await getStripe().accounts.createLoginLink(stripeAccountId);
  return link.url;
}
