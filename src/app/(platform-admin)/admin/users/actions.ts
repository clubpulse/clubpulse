'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server actions are public endpoints, so this re-checks the caller rather than trusting the page guard
export async function promoteToAdmin(formData: FormData) {
  await requireAdmin();
  const userId = formData.get('userId');
  if (typeof userId !== 'string' || !UUID.test(userId)) throw new Error('Invalid user id');

  const { error } = await createAdminClient().from('profiles').update({ role: 'admin' }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}
