'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';
import type { ActionResult } from '@/lib/types/action';
import type { ClubFeeSettings, FeeOffsetApplication, FeeOffsetSummary } from '@/lib/types/fee-offsets';

export async function getClubFeeSettings(clubId: string): Promise<ActionResult<ClubFeeSettings | null>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('club_fee_settings')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ClubFeeSettings | null };
}

export async function getMyFeeOffsetStatus(clubId: string): Promise<ActionResult<FeeOffsetSummary>> {
  const user = await requireUser();
  const supabase = await createClient();

  const season = new Date().getFullYear();

  const [settingsRes, applicationRes, walletRes] = await Promise.all([
    supabase.from('club_fee_settings').select('*').eq('club_id', clubId).maybeSingle(),
    supabase
      .from('fee_offset_applications')
      .select('*')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .eq('season', season)
      .maybeSingle(),
    supabase.from('creds_wallet').select('flexi_balance').eq('user_id', user.id).maybeSingle(),
  ]);

  if (settingsRes.error) return { success: false, error: settingsRes.error.message };
  if (!settingsRes.data) return { success: false, error: 'Fee offset not configured for this club' };

  const settings = settingsRes.data as ClubFeeSettings;
  const myBalance = walletRes.data?.flexi_balance ?? 0;
  const maxPence = Math.floor((settings.annual_fee_pence * settings.max_offset_percent) / 100);
  const maxScoresAllowed = Math.floor((maxPence * settings.scores_per_pound) / 100);
  const maxPoundsOffset = maxPence / 100;

  return {
    success: true,
    data: {
      settings,
      myApplication: applicationRes.data as FeeOffsetApplication | undefined,
      myBalance,
      maxScoresAllowed,
      maxPoundsOffset,
    },
  };
}

export async function applyFeeOffset(
  clubId: string,
  scoresToApply: number,
): Promise<ActionResult<{ scores_applied: number; pence_offset: number; pounds_offset: number }>> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('apply_fee_offset', {
    p_club_id: clubId,
    p_scores_to_apply: scoresToApply,
  });

  if (error) return { success: false, error: error.message };

  const result = data as { ok: boolean; error?: string; scores_applied?: number; pence_offset?: number; pounds_offset?: number; max_scores?: number; balance?: number };

  if (!result.ok) {
    const msgs: Record<string, string> = {
      fee_settings_not_configured: 'Fee offset is not set up for this club.',
      already_applied_this_season: 'You have already applied a fee offset this season.',
      exceeds_max_offset: `Exceeds the maximum offset allowed (max: ${result.max_scores?.toLocaleString()} Scores).`,
      insufficient_scores: `Not enough Scores — you have ${result.balance?.toLocaleString() ?? 0}.`,
    };
    return { success: false, error: msgs[result.error ?? ''] ?? result.error ?? 'Unknown error' };
  }

  return {
    success: true,
    data: {
      scores_applied: result.scores_applied!,
      pence_offset: result.pence_offset!,
      pounds_offset: Number(result.pounds_offset),
    },
  };
}

export async function updateFeeSettings(
  clubId: string,
  settings: Pick<ClubFeeSettings, 'annual_fee_pence' | 'scores_per_pound' | 'max_offset_percent' | 'is_active'>,
): Promise<ActionResult<ClubFeeSettings>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('club_fee_settings')
    .upsert({ club_id: clubId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'club_id' })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ClubFeeSettings };
}

export async function getClubFeeApplications(clubId: string): Promise<ActionResult<FeeOffsetApplication[]>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();
  const season = new Date().getFullYear();

  const { data, error } = await supabase
    .from('fee_offset_applications')
    .select('*')
    .eq('club_id', clubId)
    .eq('season', season)
    .order('applied_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as FeeOffsetApplication[] };
}

export async function approveApplication(applicationId: string, notes?: string): Promise<ActionResult<void>> {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch to verify admin access
  const { data: app } = await supabase
    .from('fee_offset_applications')
    .select('club_id')
    .eq('id', applicationId)
    .single();

  if (!app) return { success: false, error: 'Application not found' };

  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(app.club_id)) return { success: false, error: 'Not authorised' };

  const { error } = await supabase
    .from('fee_offset_applications')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      admin_notes: notes ?? null,
    })
    .eq('id', applicationId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function rejectApplication(applicationId: string, notes: string): Promise<ActionResult<void>> {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch to verify admin access and get scores to refund
  const { data: app } = await supabase
    .from('fee_offset_applications')
    .select('club_id, user_id, scores_applied, status')
    .eq('id', applicationId)
    .single();

  if (!app) return { success: false, error: 'Application not found' };
  if (app.status !== 'pending') return { success: false, error: 'Can only reject pending applications' };

  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(app.club_id)) return { success: false, error: 'Not authorised' };

  // Refund Scores and mark as rejected
  const [{ error: updateErr }, { error: refundErr }] = await Promise.all([
    supabase
      .from('fee_offset_applications')
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        admin_notes: notes,
      })
      .eq('id', applicationId),
    supabase
      .from('creds_wallet')
      .update({ flexi_balance: supabase.rpc('increment', { x: app.scores_applied }) as unknown as number, updated_at: new Date().toISOString() })
      .eq('user_id', app.user_id),
  ]);

  // Refund via RPC is safer — use raw SQL increment
  if (refundErr) {
    // Fallback: do a direct increment via select+update
    const { data: wallet } = await supabase
      .from('creds_wallet')
      .select('flexi_balance')
      .eq('user_id', app.user_id)
      .single();

    if (wallet) {
      await supabase
        .from('creds_wallet')
        .update({ flexi_balance: wallet.flexi_balance + app.scores_applied, updated_at: new Date().toISOString() })
        .eq('user_id', app.user_id);
    }
  }

  if (updateErr) return { success: false, error: updateErr.message };
  return { success: true, data: undefined };
}
