import { sendEmail } from '@/lib/email/resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { handoverAlert } from './alert';

type Admin = ReturnType<typeof createAdminClient>;

/**
 * When a club names a welfare officer, a database trigger records every open squad flag at that club as handed to them
 * (age_flag_handovers). This emails each officer once about their handed-over flags and marks the rows as notified.
 * A failed email leaves the rows unmarked so the next run tries again. Nothing is deleted: the history stays.
 */
export async function sendHandoverNotices(admin: Admin): Promise<{ sent: number; failed: number }> {
  const { data: pending, error } = await admin.from('age_flag_handovers').select('id, flag_id, club_id, officer_id').is('notified_at', null).limit(500);
  if (error) {
    console.error('[age-verification] could not read hand-overs');
    return { sent: 0, failed: 0 };
  }
  const groups = new Map<string, { clubId: string; officerId: string; ids: string[]; flagIds: string[] }>();
  for (const row of pending ?? []) {
    const key = `${row.club_id}:${row.officer_id}`;
    const group = groups.get(key) ?? { clubId: row.club_id as string, officerId: row.officer_id as string, ids: [], flagIds: [] };
    group.ids.push(row.id as string);
    group.flagIds.push(row.flag_id as string);
    groups.set(key, group);
  }
  let sent = 0;
  let failed = 0;
  for (const group of groups.values()) {
    // Only flags that are still open are worth telling the officer about. Closed ones stay in the history.
    const { data: stillOpen } = await admin.from('age_squad_mismatches').select('id').in('id', group.flagIds).is('resolved_at', null);
    const open = (stillOpen ?? []).length;
    const stamp = new Date().toISOString();
    if (open === 0) {
      for (const id of group.ids) await admin.from('age_flag_handovers').update({ notified_at: stamp }).eq('id', id);
      continue;
    }
    const [{ data: club }, { data: profile }] = await Promise.all([
      admin.from('clubs').select('name').eq('id', group.clubId).maybeSingle(),
      admin.from('profiles').select('email').eq('id', group.officerId).maybeSingle(),
    ]);
    const to = (profile as { email?: string | null } | null)?.email;
    const message = handoverAlert({ clubName: ((club as { name?: string } | null)?.name) || 'your club', count: open });
    const ok = !!to && (await sendEmail({ to, subject: message.subject, text: message.text }));
    if (ok) {
      for (const id of group.ids) await admin.from('age_flag_handovers').update({ notified_at: stamp }).eq('id', id);
      sent += 1;
    } else {
      console.error('[age-verification] hand-over notice was not sent');
      failed += 1;
    }
  }
  return { sent, failed };
}
