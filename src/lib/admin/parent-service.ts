'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { parentEligibility, parentRefusalMessage } from '@/lib/admin/parent-eligibility';
import type {
  ChildProfile,
  ChildWithConsents,
  SafeguardingIncident,
  SafeguardingNote,
  SafeguardingDashboard,
  DbsCheck,
  ConsentType,
  ConsentAction,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  Relationship,
} from '@/lib/types/parent';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ── Child profiles ──────────────────────────────────────────────────────────

export async function registerChild(
  clubId: string,
  parentId: string,
  input: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: string;
    medical_notes?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    relationship?: Relationship;
  }
): Promise<ActionResult<ChildProfile>> {
  const sb = createAdminClient();

  // Only an adult can register a child as their parent: a real date of birth on the profile, 18 or over, not a junior
  const adult = await parentEligibility(parentId);
  if (!adult.ok) return { success: false, error: parentRefusalMessage(adult.reason, 'self') };

  // Create child profile
  const { data: child, error } = await sb
    .from('child_profiles')
    .insert({
      club_id: clubId,
      first_name: input.first_name,
      last_name: input.last_name,
      date_of_birth: input.date_of_birth,
      gender: input.gender ?? null,
      medical_notes: input.medical_notes ?? null,
      emergency_contact_name: input.emergency_contact_name ?? null,
      emergency_contact_phone: input.emergency_contact_phone ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Create parent-child link
  await sb.from('parent_child_links').insert({
    parent_id: parentId,
    child_id: child.id,
    relationship: input.relationship ?? 'parent',
    is_primary: true,
  });

  return { success: true, data: child as ChildProfile };
}

export async function listChildren(clubId: string): Promise<ChildWithConsents[]> {
  const sb = createAdminClient();

  const { data: children } = await sb
    .from('child_profiles')
    .select('*')
    .eq('club_id', clubId)
    .order('last_name');

  if (!children?.length) return [];

  const childIds = children.map((c) => c.id);

  // Get active consents
  const { data: consents } = await sb
    .from('active_consents')
    .select('*')
    .in('child_id', childIds);

  // Get parent links
  const { data: links } = await sb
    .from('parent_child_links')
    .select('*')
    .in('child_id', childIds);

  // Get parent profiles
  const parentIds = [...new Set((links ?? []).map((l) => l.parent_id))];
  const parentMap = new Map<string, { name: string; email: string }>();
  if (parentIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, display_name, email')
      .in('id', parentIds);
    for (const p of profiles ?? []) {
      parentMap.set(p.id, { name: p.display_name || p.email || 'Unknown', email: p.email || '' });
    }
  }

  const linkedIds = [...new Set(children.map((c) => (c as { linked_user_id?: string | null }).linked_user_id).filter((x): x is string => !!x))];
  const linkedMap = new Map<string, { name: string; email: string }>();
  if (linkedIds.length > 0) {
    const { data: linked } = await sb.from('profiles').select('id, display_name, full_name, email').in('id', linkedIds);
    for (const p of linked ?? []) linkedMap.set(p.id, { name: p.display_name || p.full_name || 'Member', email: p.email || '' });
  }

  return children.map((c) => ({
    ...(c as ChildProfile),
    linked_account: (c as { linked_user_id?: string | null }).linked_user_id ? linkedMap.get((c as { linked_user_id: string }).linked_user_id) ?? null : null,
    consents: (consents ?? []).filter((co) => co.child_id === c.id),
    links: (links ?? [])
      .filter((l) => l.child_id === c.id)
      .map((l) => ({
        ...l,
        parent_name: parentMap.get(l.parent_id)?.name ?? 'Unknown',
        parent_email: parentMap.get(l.parent_id)?.email ?? '',
      })),
  })) as ChildWithConsents[];
}

export async function verifyParentLink(
  linkId: string,
  adminId: string
): Promise<ActionResult<null>> {
  const sb = createAdminClient();
  const { error } = await sb
    .from('parent_child_links')
    .update({ verified_at: new Date().toISOString(), verified_by: adminId })
    .eq('id', linkId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Consent management ──────────────────────────────────────────────────────

export async function recordConsent(
  childId: string,
  parentId: string,
  consentType: ConsentType,
  action: ConsentAction,
  meta?: { ip_address?: string; user_agent?: string; notes?: string }
): Promise<ActionResult<null>> {
  const sb = createAdminClient();
  const { error } = await sb.from('consent_records').insert({
    child_id: childId,
    parent_id: parentId,
    consent_type: consentType,
    action,
    ip_address: meta?.ip_address ?? null,
    user_agent: meta?.user_agent ?? null,
    notes: meta?.notes ?? null,
  });

  // Update quick-access flags on child profile
  if (consentType === 'photo_video') {
    await sb.from('child_profiles').update({ photo_consent: action === 'granted' }).eq('id', childId);
  }
  if (consentType === 'data_processing') {
    await sb.from('child_profiles').update({ data_consent: action === 'granted' }).eq('id', childId);
  }

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function getConsentHistory(childId: string): Promise<import('@/lib/types/parent').ConsentRecord[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('consent_records')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });
  return (data ?? []) as import('@/lib/types/parent').ConsentRecord[];
}

// ── Safeguarding incidents ──────────────────────────────────────────────────

export async function reportIncident(
  clubId: string,
  reporterId: string,
  input: {
    child_id?: string;
    severity: IncidentSeverity;
    category: IncidentCategory;
    description: string;
    is_confidential?: boolean;
  }
): Promise<ActionResult<SafeguardingIncident>> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('safeguarding_incidents')
    .insert({
      club_id: clubId,
      reported_by: reporterId,
      child_id: input.child_id ?? null,
      severity: input.severity,
      category: input.category,
      description: input.description,
      is_confidential: input.is_confidential ?? true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SafeguardingIncident };
}

export async function listIncidents(
  clubId: string,
  opts?: { status?: IncidentStatus }
): Promise<SafeguardingIncident[]> {
  const sb = createAdminClient();
  let q = sb
    .from('safeguarding_incidents')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (opts?.status) q = q.eq('status', opts.status);

  const { data } = await q;
  return (data ?? []) as SafeguardingIncident[];
}

export async function updateIncident(
  incidentId: string,
  updates: Partial<{
    status: IncidentStatus;
    severity: IncidentSeverity;
    actions_taken: string;
    outcome: string;
    assigned_to: string;
    resolved_at: string;
  }>
): Promise<ActionResult<SafeguardingIncident>> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('safeguarding_incidents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', incidentId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SafeguardingIncident };
}

export async function addIncidentNote(
  incidentId: string,
  authorId: string,
  note: string,
  isInternal = true
): Promise<ActionResult<SafeguardingNote>> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('safeguarding_notes')
    .insert({ incident_id: incidentId, author_id: authorId, note, is_internal: isInternal })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SafeguardingNote };
}

export async function getIncidentDetail(incidentId: string): Promise<{
  incident: SafeguardingIncident;
  notes: (SafeguardingNote & { author_name: string })[];
} | null> {
  const sb = createAdminClient();
  const { data: incident } = await sb
    .from('safeguarding_incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (!incident) return null;

  const { data: notes } = await sb
    .from('safeguarding_notes')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at');

  const authorIds = [...new Set((notes ?? []).map((n) => n.author_id))];
  const authorMap = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, display_name, email')
      .in('id', authorIds);
    for (const p of profiles ?? []) {
      authorMap.set(p.id, p.display_name || p.email || 'Unknown');
    }
  }

  return {
    incident: incident as SafeguardingIncident,
    notes: (notes ?? []).map((n) => ({
      ...(n as SafeguardingNote),
      author_name: authorMap.get(n.author_id) ?? 'Unknown',
    })),
  };
}

// ── DBS checks ──────────────────────────────────────────────────────────────

export async function listDbsChecks(clubId: string): Promise<(DbsCheck & { user_name: string })[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('dbs_checks')
    .select('*')
    .eq('club_id', clubId)
    .order('expiry_date', { ascending: true });

  if (!data?.length) return [];

  const userIds = [...new Set(data.map((d) => d.user_id))];
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name || p.email || 'Unknown'])
  );

  return data.map((d) => ({
    ...(d as DbsCheck),
    user_name: nameMap.get(d.user_id) ?? 'Unknown',
  }));
}

export async function verifyDbsCheck(
  checkId: string,
  adminId: string,
  status: 'valid' | 'rejected'
): Promise<ActionResult<null>> {
  const sb = createAdminClient();
  const { error } = await sb
    .from('dbs_checks')
    .update({ status, verified_by: adminId, verified_at: new Date().toISOString() })
    .eq('id', checkId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Dashboard analytics ─────────────────────────────────────────────────────

export async function getSafeguardingDashboard(clubId: string): Promise<SafeguardingDashboard> {
  const sb = createAdminClient();

  const [incidents, children, links, dbs] = await Promise.all([
    sb.from('safeguarding_incidents')
      .select('severity, status')
      .eq('club_id', clubId)
      .in('status', ['reported', 'under_review', 'escalated']),
    sb.from('child_profiles')
      .select('id, photo_consent, data_consent', { count: 'exact' })
      .eq('club_id', clubId),
    sb.from('parent_child_links')
      .select('id', { count: 'exact' })
      .is('verified_at', null),
    sb.from('dbs_checks')
      .select('id', { count: 'exact' })
      .eq('club_id', clubId)
      .eq('status', 'valid')
      .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ]);

  const openIncidents = incidents.data ?? [];
  const criticalCount = openIncidents.filter((i) => i.severity === 'critical').length;
  const childrenData = children.data ?? [];
  const fullConsent = childrenData.filter((c) => c.photo_consent && c.data_consent).length;
  const coverage = childrenData.length > 0 ? Math.round((fullConsent / childrenData.length) * 100) : 0;

  return {
    open_incidents: openIncidents.length,
    critical_incidents: criticalCount,
    children_registered: children.count ?? 0,
    pending_verifications: links.count ?? 0,
    expiring_dbs: dbs.count ?? 0,
    consent_coverage: coverage,
  };
}
