// Server-only. Whether a signed-in person may use the paid features. The caller has verified the user.

import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/auth/admin';
import { playerCheckoutEnabled } from '@/lib/billing/player';
import { isLive } from '@/lib/billing/player-plans';
import { decideAccess, parseFreeList, type Access } from '@/lib/billing/access-logic';

const STAFF_ROLES = ['coach', 'admin', 'club_admin'];

export async function getPaidAccess(userId: string, email: string | null | undefined): Promise<Access> {
  const paymentsOn = playerCheckoutEnabled();
  // Nothing to look up while everything is open
  if (!paymentsOn) return decideAccess({ paymentsOn, platformAdmin: false, onFreeList: false, hasLivePlan: false, staffOfPayingClub: false });

  const platformAdmin = isPlatformAdmin(userId);
  // FREE_ACCESS_EMAILS in Vercel: testers, founders and demo accounts, separated by commas
  const onFreeList = !!email && parseFreeList(process.env.FREE_ACCESS_EMAILS).has(email.toLowerCase());
  if (platformAdmin || onFreeList) return decideAccess({ paymentsOn, platformAdmin, onFreeList, hasLivePlan: false, staffOfPayingClub: false });

  const admin = createAdminClient();
  const [{ data: plan }, { data: staffAt }] = await Promise.all([
    admin.from('player_subscriptions').select('status').eq('user_id', userId).maybeSingle(),
    admin.from('club_members').select('club_id').eq('user_id', userId).eq('is_active', true).in('role', STAFF_ROLES),
  ]);

  let staffOfPayingClub = false;
  const clubIds = (staffAt ?? []).map((r) => r.club_id as string);
  if (clubIds.length > 0) {
    const { data: subs } = await admin.from('club_subscriptions').select('tier, status').in('club_id', clubIds);
    staffOfPayingClub = (subs ?? []).some((s) => s.tier !== 'free' && isLive(s.status as string));
  }

  return decideAccess({ paymentsOn, platformAdmin, onFreeList, hasLivePlan: isLive(plan?.status as string | undefined), staffOfPayingClub });
}
