'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { addMember, changeMemberStanding } from '@/lib/admin/member-standing';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE = '/admin/clubs';

// Where the screen goes back to, with a short message it shows at the top
function back(kind: 'done' | 'error', message: string): never {
  revalidatePath(BASE);
  redirect(`${BASE}?${kind}=${encodeURIComponent(message)}`);
}

const text = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

// Server actions are public endpoints, so each one re-checks that the caller is SHIFTUP staff

/** Adds a club. It starts with no admin; add one next. */
export async function createClub(formData: FormData) {
  await requireAdmin();
  const name = text(formData.get('name'));
  if (name.length < 2 || name.length > 80) back('error', 'Give the club a name of 2 to 80 characters.');

  const { error } = await createAdminClient().from('clubs').insert({ name });
  if (error) back('error', `Could not add the club: ${error.message}`);
  back('done', `Added ${name}. Now add its admin.`);
}

/** Makes someone who has signed up the admin of a club, by their email. */
export async function addClubAdmin(formData: FormData) {
  const staff = await requireAdmin();
  const clubId = text(formData.get('clubId'));
  const email = text(formData.get('email')).toLowerCase();
  if (!UUID.test(clubId)) back('error', 'That club was not found.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back('error', 'Enter the email they signed up with.');

  const service = createAdminClient();
  const { data: club } = await service.from('clubs').select('name').eq('id', clubId).maybeSingle();
  if (!club) back('error', 'That club was not found.');

  // The sign-in system has no look-up by email, so page through the accounts until it turns up
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) back('error', `Could not look them up: ${error.message}`);
    const users = data?.users ?? [];
    userId = users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (users.length < 200) break;
  }
  if (!userId) back('error', `No account with ${email}. They need to sign up first.`);

  const { data: existing } = await service.from('club_members').select('id, is_junior').eq('club_id', clubId).eq('user_id', userId!).maybeSingle();
  const who = { actorId: staff.id, platform: true };
  const reason = `Platform admin made ${email} a club admin`;
  if (existing?.is_junior) back('error', 'A junior cannot be made a club admin.');
  // Both writes go through the checked path, so each leaves an audit row
  const added = await addMember(who, clubId, userId!, 'club_admin', reason, 'platform_admin');
  if (!added.success) back('error', `Could not make them an admin: ${added.error}`);
  const { data: row } = await service.from('club_members').select('id, is_junior').eq('club_id', clubId).eq('user_id', userId!).maybeSingle();
  if (row?.is_junior) back('error', 'A junior cannot be made a club admin.');
  const made = await changeMemberStanding(who, row!.id as string, 'club_admin', false, reason, 'platform_admin');
  if (!made.success) back('error', `Could not make them an admin: ${made.error}`);
  back('done', `${email} is now an admin of ${club!.name}.`);
}

/** Takes admin off someone. They stay in the club as a player. */
export async function removeClubAdmin(formData: FormData) {
  const admin = await requireAdmin();
  const clubId = text(formData.get('clubId'));
  const userId = text(formData.get('userId'));
  if (!UUID.test(clubId) || !UUID.test(userId)) back('error', 'That admin was not found.');

  const { data: row } = await createAdminClient().from('club_members').select('id, is_junior')
    .eq('club_id', clubId).eq('user_id', userId).eq('role', 'club_admin').maybeSingle();
  if (!row) back('error', 'That admin was not found.');
  const removed = await changeMemberStanding({ actorId: admin.id, platform: true }, row!.id as string, 'player', row!.is_junior === true,
    'Platform admin removed club admin', 'platform_admin');
  if (!removed.success) back('error', `Could not remove them: ${removed.error}`);
  back('done', 'Admin removed. They are still a member of the club.');
}
