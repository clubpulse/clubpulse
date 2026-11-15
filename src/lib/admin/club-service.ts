/**
 * Server-side service functions for club onboarding, subscription, and Scores purchasing.
 *
 * Every function re-checks club admin rights (service-role client bypasses RLS).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { isClubAdmin } from '@/lib/auth/admin';
import { isUuid } from '@/lib/utils/validate';
import type { ActionResult } from '@/lib/types/action';
import type { Club } from '@/lib/types/club';
import type {
  ClubSubscription,
  ClubStripeAccount,
  ScoresPack,
  ScoresPackPurchase,
} from '@/lib/types/subscription';

const FORBIDDEN = 'You do not have access to this club';

async function requireAdmin(userId: string, clubId: string): Promise<string | null> {
  if (!isUuid(clubId) || !(await isClubAdmin(userId, clubId))) return FORBIDDEN;
  return null;
}

// ── Club settings ────────────────────────────────────────────────────────────

export type ClubSettings = {
  club: Club;
  subscription: ClubSubscription | null;
  stripeAccount: ClubStripeAccount | null;
  scoresPoolBalance: number;
  memberCount: number;
};

export async function getClubSettings(
  userId: string,
  clubId: string,
): Promise<ActionResult<ClubSettings>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const admin = createAdminClient();

  const [clubRes, subRes, stripeRes, memberRes] = await Promise.all([
    admin.from('clubs').select('*').eq('id', clubId).maybeSingle(),
    admin.from('club_subscriptions').select('*').eq('club_id', clubId).maybeSingle(),
    admin.from('club_stripe_accounts').select('*').eq('club_id', clubId).maybeSingle(),
    admin
      .from('club_members')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('is_active', true),
  ]);

  const club = clubRes.data as Club | null;
  if (!club) return { success: false, error: 'Club not found' };

  return {
    success: true,
    data: {
      club,
      subscription: (subRes.data as ClubSubscription | null) ?? null,
      stripeAccount: (stripeRes.data as ClubStripeAccount | null) ?? null,
      scoresPoolBalance: (club as Record<string, unknown>).scores_pool_balance as number ?? 0,
      memberCount: memberRes.count ?? 0,
    },
  };
}

// ── Scores pack display ──────────────────────────────────────────────────────

export async function getScoresPacksForClub(
  userId: string,
  clubId: string,
): Promise<
  ActionResult<{
    packs: ScoresPack[];
    poolBalance: number;
    recentPurchases: ScoresPackPurchase[];
  }>
> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const admin = createAdminClient();

  const [packsRes, clubRes, purchasesRes] = await Promise.all([
    admin
      .from('scores_packs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    admin
      .from('clubs')
      .select('scores_pool_balance')
      .eq('id', clubId)
      .maybeSingle(),
    admin
      .from('scores_pack_purchases')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    success: true,
    data: {
      packs: (packsRes.data ?? []) as ScoresPack[],
      poolBalance: (clubRes.data as Record<string, unknown>)?.scores_pool_balance as number ?? 0,
      recentPurchases: (purchasesRes.data ?? []) as ScoresPackPurchase[],
    },
  };
}

// ── Club onboarding checklist ────────────────────────────────────────────────

export type OnboardingStep = {
  key: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
};

export async function getOnboardingChecklist(
  userId: string,
  clubId: string,
): Promise<ActionResult<OnboardingStep[]>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const admin = createAdminClient();

  const [club, sub, stripe, members, rules] = await Promise.all([
    admin.from('clubs').select('name, ground_lat, primary_colour').eq('id', clubId).maybeSingle(),
    admin.from('club_subscriptions').select('tier, status').eq('club_id', clubId).maybeSingle(),
    admin.from('club_stripe_accounts').select('onboarding_complete').eq('club_id', clubId).maybeSingle(),
    admin.from('club_members').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('is_active', true),
    admin.from('club_scores_rules').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
  ]);

  const c = club.data as Record<string, unknown> | null;

  const steps: OnboardingStep[] = [
    {
      key: 'profile',
      label: 'Set up club profile',
      description: 'Add your club name, location, and colours',
      complete: !!(c?.name && c?.ground_lat && c?.primary_colour),
      href: '/admin/club/settings',
    },
    {
      key: 'members',
      label: 'Invite members',
      description: 'Add at least 5 members to get started',
      complete: (members.count ?? 0) >= 5,
      href: '/admin/club/members',
    },
    {
      key: 'stripe',
      label: 'Connect Stripe',
      description: 'Enable payments and Scores purchasing',
      complete: stripe.data?.onboarding_complete ?? false,
      href: '/admin/club/settings',
    },
    {
      key: 'subscription',
      label: 'Choose your plan',
      description: 'Upgrade from Free to unlock more features',
      complete: sub.data?.tier !== 'free' && sub.data?.status === 'active',
      href: '/admin/club/settings',
    },
    {
      key: 'scores',
      label: 'Configure Scores rules',
      description: 'Customise how members earn Scores',
      complete: (rules.count ?? 0) > 0,
      href: '/admin/club/scores-rules',
    },
  ];

  return { success: true, data: steps };
}

// ── Update club profile ──────────────────────────────────────────────────────

export type ClubProfileUpdate = {
  name?: string;
  short_name?: string;
  sport?: string;
  location_address?: string;
  location_city?: string;
  location_postcode?: string;
  ground_lat?: number;
  ground_lng?: number;
  primary_colour?: string;
  secondary_colour?: string;
};

export async function updateClubProfile(
  userId: string,
  clubId: string,
  patch: ClubProfileUpdate,
): Promise<ActionResult<Club>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  // Sanitise
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = String(patch.name).trim().slice(0, 100);
  if (patch.short_name !== undefined) update.short_name = String(patch.short_name).trim().slice(0, 20);
  if (patch.sport !== undefined) update.sport = String(patch.sport).trim().slice(0, 40);
  if (patch.location_address !== undefined) update.location_address = String(patch.location_address).trim().slice(0, 200);
  if (patch.location_city !== undefined) update.location_city = String(patch.location_city).trim().slice(0, 60);
  if (patch.location_postcode !== undefined) update.location_postcode = String(patch.location_postcode).trim().slice(0, 10);
  if (patch.ground_lat !== undefined) update.ground_lat = Number(patch.ground_lat);
  if (patch.ground_lng !== undefined) update.ground_lng = Number(patch.ground_lng);
  if (patch.primary_colour !== undefined) update.primary_colour = String(patch.primary_colour).trim().slice(0, 7);
  if (patch.secondary_colour !== undefined) update.secondary_colour = String(patch.secondary_colour).trim().slice(0, 7);

  if (Object.keys(update).length === 0) {
    return { success: false, error: 'Nothing to update' };
  }

  const { data, error } = await createAdminClient()
    .from('clubs')
    .update(update)
    .eq('id', clubId)
    .select('*')
    .maybeSingle();

  if (error || !data) return { success: false, error: 'Could not update club' };
  return { success: true, data: data as Club };
}
