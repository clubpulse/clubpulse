'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type {
  ClubDocument,
  DocumentAcknowledgement,
  DocumentCategory,
  MandatoryDocWithAck,
  AcknowledgementStatus,
} from '@/lib/types/documents';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Member actions ────────────────────────────────────────────────────────────

export async function getClubDocuments(
  clubId: string,
  category?: DocumentCategory,
): Promise<ActionResult<ClubDocument[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  let query = supabase
    .from('club_documents')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ClubDocument[] };
}

export async function getMandatoryDocs(
  clubId: string,
): Promise<ActionResult<MandatoryDocWithAck[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data: docs, error: docsErr } = await supabase
    .from('club_documents')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_mandatory', true)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (docsErr) return { success: false, error: docsErr.message };

  const docIds = (docs ?? []).map((d) => d.id as string);

  let ackMap: Record<string, string> = {};
  if (docIds.length > 0) {
    const { data: acks } = await supabase
      .from('document_acknowledgements')
      .select('document_id, acknowledged_at')
      .eq('user_id', userId)
      .in('document_id', docIds);
    for (const a of acks ?? []) {
      ackMap[a.document_id as string] = a.acknowledged_at as string;
    }
  }

  const result: MandatoryDocWithAck[] = (docs ?? []).map((d) => ({
    ...(d as ClubDocument),
    acknowledged_at: ackMap[d.id as string] ?? null,
  }));

  return { success: true, data: result };
}

export async function acknowledgeDocument(
  documentId: string,
): Promise<ActionResult<DocumentAcknowledgement>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('document_acknowledgements')
    .upsert({ document_id: documentId, user_id: userId }, { onConflict: 'document_id,user_id' })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as DocumentAcknowledgement };
}

export async function getMyAcknowledgements(
  clubId: string,
): Promise<ActionResult<DocumentAcknowledgement[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('document_acknowledgements')
    .select('*, club_documents!inner(club_id)')
    .eq('user_id', userId)
    .eq('club_documents.club_id', clubId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as DocumentAcknowledgement[] };
}

// ── Admin actions ─────────────────────────────────────────────────────────────

export async function adminAddDocument(
  data: Omit<ClubDocument, 'id' | 'is_active' | 'created_at'>,
): Promise<ActionResult<ClubDocument>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from('club_documents')
    .insert({ ...data, uploaded_by: userId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: doc as ClubDocument };
}

export async function adminUpdateDocument(
  id: string,
  updates: Partial<Omit<ClubDocument, 'id' | 'club_id' | 'created_at'>>,
): Promise<ActionResult<ClubDocument>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('club_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ClubDocument };
}

export async function adminDeactivateDocument(id: string): Promise<ActionResult<null>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('club_documents')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function adminGetAcknowledgementStatus(
  documentId: string,
  clubId: string,
): Promise<ActionResult<AcknowledgementStatus>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: members, error: membErr } = await supabase
    .from('club_members')
    .select('user_id, profiles(display_name)')
    .eq('club_id', clubId)
    .eq('is_active', true);

  if (membErr) return { success: false, error: membErr.message };

  const { data: acks, error: acksErr } = await supabase
    .from('document_acknowledgements')
    .select('user_id')
    .eq('document_id', documentId);

  if (acksErr) return { success: false, error: acksErr.message };

  const ackedIds = new Set((acks ?? []).map((a) => a.user_id as string));
  const allMembers = members ?? [];
  const unacked = allMembers
    .filter((m) => !ackedIds.has(m.user_id as string))
    .map((m) => ({
      user_id: m.user_id as string,
      display_name: (m.profiles as { display_name: string | null } | null)?.display_name ?? null,
    }));

  return {
    success: true,
    data: {
      document_id: documentId,
      total_members: allMembers.length,
      acked_count: ackedIds.size,
      unacked_members: unacked,
    },
  };
}
