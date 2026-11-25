'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/server';
import { isClubAdmin } from '@/lib/auth/admin';
import { encryptApiKey, encryptionSecret } from '@/lib/playcricket/crypto';
import { playCricketSyncEnabled } from '@/lib/playcricket/flag';
import { linkedAccountIsPrivate } from '@/lib/playcricket/privacy';

export type PlayCricketStatus = {
  enabled: boolean;
  connected: boolean;
  siteId: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

const SITE = /^\d{2,12}$/;

export async function getPlayCricketStatus(clubId: string): Promise<PlayCricketStatus> {
  const enabled = playCricketSyncEnabled();
  if (!enabled) return { enabled: false, connected: false, siteId: null, connectedAt: null, lastSyncAt: null, lastError: null };
  const user = await requireUser();
  if (!(await isClubAdmin(user.id, clubId))) return { enabled: true, connected: false, siteId: null, connectedAt: null, lastSyncAt: null, lastError: null };
  const { data } = await createAdminClient().from('playcricket_connections').select('site_id, connected_at, last_sync_at, last_error').eq('club_id', clubId).maybeSingle();
  if (!data) return { enabled: true, connected: false, siteId: null, connectedAt: null, lastSyncAt: null, lastError: null };
  return {
    enabled: true,
    connected: true,
    siteId: data.site_id as string,
    connectedAt: data.connected_at as string,
    lastSyncAt: (data.last_sync_at as string | null) ?? null,
    lastError: (data.last_error as string | null) ?? null,
  };
}

export async function connectPlayCricket(clubId: string, siteId: unknown, apiKey: unknown): Promise<{ success: true } | { success: false; error: string }> {
  if (!playCricketSyncEnabled()) return { success: false, error: 'Play-Cricket sync is not open yet.' };
  const user = await requireUser();
  if (!(await isClubAdmin(user.id, clubId))) return { success: false, error: 'Only a club admin can connect Play-Cricket.' };
  const site = typeof siteId === 'string' ? siteId.trim() : '';
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!SITE.test(site)) return { success: false, error: 'Enter the Play-Cricket site ID from your club site.' };
  if (key.length < 8 || key.length > 200) return { success: false, error: 'Enter the API key the ECB sent to your club.' };
  let stored: { ciphertext: string; iv: string };
  try {
    stored = encryptApiKey(key, encryptionSecret());
  } catch {
    return { success: false, error: 'Play-Cricket key storage is not configured.' };
  }
  const { error } = await createAdminClient().from('playcricket_connections').upsert({
    club_id: clubId,
    site_id: site,
    key_ciphertext: stored.ciphertext,
    key_iv: stored.iv,
    connected_by: user.id,
    connected_at: new Date().toISOString(),
    last_error: null,
    next_attempt_at: null,
  }, { onConflict: 'club_id' });
  if (error) return { success: false, error: 'Could not save the connection.' };
  revalidatePath('/admin/club/settings');
  return { success: true };
}

export async function disconnectPlayCricket(clubId: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!playCricketSyncEnabled()) return { success: false, error: 'Play-Cricket sync is not open yet.' };
  const user = await requireUser();
  if (!(await isClubAdmin(user.id, clubId))) return { success: false, error: 'Only a club admin can disconnect Play-Cricket.' };
  const admin = createAdminClient();
  await admin.from('playcricket_scorecard_players').delete().eq('club_id', clubId);
  await admin.from('playcricket_results').delete().eq('club_id', clubId);
  await admin.from('playcricket_matches').delete().eq('club_id', clubId);
  await admin.from('playcricket_player_links').delete().eq('club_id', clubId);
  const { error } = await admin.from('playcricket_connections').delete().eq('club_id', clubId);
  if (error) return { success: false, error: 'Could not remove the connection.' };
  revalidatePath('/admin/club/settings');
  return { success: true };
}

export async function linkPlayCricketPlayer(clubId: string, playerName: unknown, teamId: unknown, userId: unknown): Promise<{ success: true } | { success: false; error: string }> {
  if (!playCricketSyncEnabled()) return { success: false, error: 'Play-Cricket sync is not open yet.' };
  const adminUser = await requireUser();
  if (!(await isClubAdmin(adminUser.id, clubId))) return { success: false, error: 'Only a club admin can link a player.' };
  const name = typeof playerName === 'string' ? playerName.trim() : '';
  if (name.length < 2 || name.length > 80) return { success: false, error: 'Enter the name as it appears on the Play-Cricket scorecard.' };
  if (typeof userId !== 'string') return { success: false, error: 'Choose a club member.' };
  const team = typeof teamId === 'string' && teamId.trim() ? teamId.trim() : null;
  const db = createAdminClient();
  const { data: member } = await db.from('club_members').select('user_id').eq('club_id', clubId).eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!member) return { success: false, error: 'That person is not an active member of this club.' };
  const { error } = await db.from('playcricket_player_links').upsert({
    club_id: clubId,
    player_name: name,
    team_id: team,
    user_id: userId,
    linked_by: adminUser.id,
    linked_at: new Date().toISOString(),
  }, { onConflict: 'club_id,player_name,team_id' });
  if (error) return { success: false, error: 'Could not save the link.' };
  return { success: true };
}

/** Links a club admin may see. The date of birth is never selected. Other people do not receive a junior or unverified account id. */
export async function listPlayCricketLinks(clubId: string): Promise<Array<{ playerName: string; teamId: string | null; userId: string | null }>> {
  if (!playCricketSyncEnabled()) return [];
  const user = await requireUser();
  const admin = await isClubAdmin(user.id, clubId);
  const db = createAdminClient();
  const { data: links } = await db.from('playcricket_player_links').select('player_name, team_id, user_id').eq('club_id', clubId);
  const ids = [...new Set((links ?? []).map((l) => l.user_id as string))];
  const [{ data: members }, { data: profiles }] = await Promise.all([
    ids.length ? db.from('club_members').select('user_id, is_junior').eq('club_id', clubId).in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from('profiles').select('id, date_of_birth').in('id', ids) : Promise.resolve({ data: [] }),
  ]);
  return (links ?? []).map((link) => {
    const member = (members ?? []).find((m) => m.user_id === link.user_id);
    const profile = (profiles ?? []).find((p) => p.id === link.user_id);
    const hide = !admin && linkedAccountIsPrivate({
      isJunior: member?.is_junior === true,
      dateOfBirth: (profile?.date_of_birth as string | null) ?? null,
    });
    return { playerName: link.player_name as string, teamId: (link.team_id as string | null) ?? null, userId: hide ? null : (link.user_id as string) };
  });
}
