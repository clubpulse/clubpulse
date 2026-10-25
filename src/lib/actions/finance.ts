'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { FinanceEntry, FinanceMonthSummary, EntryType } from '@/lib/types/finance';
import { parsePoundsToPence } from '@/lib/types/finance';
import { revalidatePath } from 'next/cache';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface GetFinanceEntriesOptions {
  type?: EntryType
  month?: string
  limit?: number
  offset?: number
}

export async function getFinanceEntries(
  clubId: string,
  options: GetFinanceEntriesOptions = {}
): Promise<ActionResult<FinanceEntry[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  let query = supabase
    .from('finance_entries')
    .select('*')
    .eq('club_id', clubId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options.type) query = query.eq('entry_type', options.type);
  if (options.month) {
    const [year, mon] = options.month.split('-');
    const start = `${year}-${mon}-01`;
    const end = new Date(parseInt(year), parseInt(mon), 0).toISOString().split('T')[0];
    query = query.gte('entry_date', start).lte('entry_date', end);
  }
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as FinanceEntry[] };
}

export async function getFinanceSummary(clubId: string): Promise<ActionResult<FinanceMonthSummary[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('finance_club_summary')
    .select('*')
    .eq('club_id', clubId)
    .order('month', { ascending: false })
    .limit(12);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as FinanceMonthSummary[] };
}

export interface FinanceStats {
  total_income_pence: number
  total_expense_pence: number
  net_pence: number
  income_count: number
  expense_count: number
}

export async function getFinanceStats(clubId: string): Promise<ActionResult<FinanceStats>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('finance_entries')
    .select('entry_type, amount_pence')
    .eq('club_id', clubId);

  if (error) return { success: false, error: error.message };

  const stats: FinanceStats = {
    total_income_pence: 0,
    total_expense_pence: 0,
    net_pence: 0,
    income_count: 0,
    expense_count: 0,
  };

  for (const row of data ?? []) {
    if (row.entry_type === 'income') {
      stats.total_income_pence += row.amount_pence;
      stats.income_count++;
    } else {
      stats.total_expense_pence += row.amount_pence;
      stats.expense_count++;
    }
  }
  stats.net_pence = stats.total_income_pence - stats.total_expense_pence;
  return { success: true, data: stats };
}

export async function getRunningBalance(clubId: string): Promise<ActionResult<number>> {
  const result = await getFinanceStats(clubId);
  if (!result.success) return result;
  return { success: true, data: result.data.net_pence };
}

export interface AddFinanceEntryInput {
  club_id: string
  entry_type: EntryType
  category: string
  description: string
  amount_pounds: string
  entry_date: string
}

export async function addFinanceEntry(input: AddFinanceEntryInput): Promise<ActionResult<FinanceEntry>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const amount_pence = parsePoundsToPence(input.amount_pounds);
  if (isNaN(amount_pence) || amount_pence <= 0) return { success: false, error: 'Invalid amount' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('finance_entries')
    .insert({
      club_id: input.club_id,
      entry_type: input.entry_type,
      category: input.category,
      description: input.description,
      amount_pence,
      entry_date: input.entry_date,
      recorded_by: userId,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/club/finance');
  revalidatePath('/finance');
  return { success: true, data: data as FinanceEntry };
}

export async function deleteFinanceEntry(id: string): Promise<ActionResult<void>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('finance_entries')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/club/finance');
  revalidatePath('/finance');
  return { success: true, data: undefined };
}
