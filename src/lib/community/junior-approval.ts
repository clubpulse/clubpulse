// Two juniors connect only once a verified parent of each has said yes. Both children say yes first; the
// connection then waits ("awaiting_parents"), every verified parent of both children is asked, and it opens when each
// child has an approving parent. Any parent saying no closes it. Nothing can be sent between the two until it opens.

import { createAdminClient } from '@/lib/supabase/admin';
import { notify } from './notify';
import { JUNIORS_OFF, juniorsOpen, no, ok, parentsOf, people, type Admin, type Result } from './service';

export type Approval = { junior_id: string; decision: 'approved' | 'declined' };

/** Waiting until every junior has an approving parent; closed by any decline. */
export function outcome(juniorIds: string[], approvals: Approval[]): 'approved' | 'declined' | 'waiting' {
  if (approvals.some((a) => a.decision === 'declined')) return 'declined';
  return juniorIds.every((j) => approvals.some((a) => a.junior_id === j && a.decision === 'approved')) ? 'approved' : 'waiting';
}

type Event = 'sent_to_parents' | 'parent_approved' | 'parent_declined' | 'accepted' | 'declined';
async function logEvent(admin: Admin, connectionId: string, actor: string, other: string, event: Event) {
  try { await admin.from('community_connection_events').insert({ connection_id: connectionId, actor_id: actor, other_id: other, event, both_junior: true }); } catch { /* the audit trail never blocks the action */ }
}

/**
 * Both juniors have said yes. Holds the connection and asks every verified parent of both. Refuses, leaving the
 * connection as it was, if either child has no verified parent (the age gate should already have stopped that).
 */
export async function startParentApproval(admin: Admin, connectionId: string, actor: string, a: string, b: string): Promise<Result<{ awaiting: true }>> {
  const [pa, pb] = await Promise.all([parentsOf(admin, a), parentsOf(admin, b)]);
  if (pa.length === 0 || pb.length === 0) return no('Both of you need a parent linked first.');
  await admin.from('community_connections').update({ status: 'awaiting_parents', responded_at: new Date().toISOString() }).eq('id', connectionId);
  await logEvent(admin, connectionId, actor, b === actor ? a : b, 'sent_to_parents');
  const who = await people(admin, [a, b]);
  const nameOf = (id: string) => who.get(id)?.name ?? 'A young person';
  const clubOf = (id: string) => (who.get(id)?.clubName ? ` from ${who.get(id)!.clubName}` : '');
  for (const [child, friend, parents] of [[a, b, pa], [b, a, pb]] as const) {
    for (const parent of parents) {
      await notify(admin, parent, {
        kind: 'parent_approval_needed', title: 'Your child would like to connect',
        body: `${nameOf(child)} would like to connect with ${nameOf(friend)}${clubOf(friend)}. Nothing happens unless you approve.`,
        data: { connectionId },
      });
    }
    await notify(admin, child, { kind: 'connect_accepted', title: 'Waiting for a parent', body: `Your parent needs to say yes before you and ${nameOf(friend)} can message.`, data: { connectionId } });
  }
  return ok({ awaiting: true });
}

export type ApprovalRequest = { connectionId: string; childId: string; childName: string; otherName: string; otherClub: string | null; decided: 'approved' | null };

/** Connections waiting on this parent, for each child they are verified for. */
export async function getApprovalsForParent(parentId: string): Promise<Result<ApprovalRequest[]>> {
  const admin = createAdminClient();
  const { data: links } = await admin.from('parent_child_links').select('verified_at, child_profiles ( id, first_name, linked_user_id )').eq('parent_id', parentId).not('verified_at', 'is', null);
  const kids = (links ?? []).flatMap((l) => {
    const c = (Array.isArray(l.child_profiles) ? l.child_profiles[0] : l.child_profiles) as { id: string; first_name: string; linked_user_id: string | null } | null;
    return c && c.linked_user_id ? [{ childId: c.id, name: c.first_name, uid: c.linked_user_id }] : [];
  });
  if (kids.length === 0) return ok([]);
  const uids = kids.map((k) => k.uid);
  const { data: conns } = await admin.from('community_connections').select('id, requester_id, addressee_id')
    .eq('status', 'awaiting_parents').or(uids.map((u) => `requester_id.eq.${u},addressee_id.eq.${u}`).join(','));
  const rows = conns ?? [];
  if (rows.length === 0) return ok([]);
  const { data: mine } = await admin.from('community_connection_approvals').select('connection_id, junior_id, decision').eq('parent_id', parentId).in('connection_id', rows.map((r) => r.id as string));
  const others = rows.flatMap((r) => [r.requester_id as string, r.addressee_id as string]).filter((id) => !uids.includes(id));
  const who = await people(admin, others);
  const out: ApprovalRequest[] = [];
  for (const r of rows) {
    for (const k of kids) {
      if (r.requester_id !== k.uid && r.addressee_id !== k.uid) continue;
      const other = (r.requester_id === k.uid ? r.addressee_id : r.requester_id) as string;
      const done = (mine ?? []).find((m) => m.connection_id === r.id && m.junior_id === k.uid);
      out.push({ connectionId: r.id as string, childId: k.childId, childName: k.name, otherName: who.get(other)?.name ?? 'Another young person', otherClub: who.get(other)?.clubName ?? null, decided: done?.decision === 'approved' ? 'approved' : null });
    }
  }
  return ok(out);
}

/** A verified parent of one of the two children approves or declines. */
export async function decideJuniorConnection(parentId: string, connectionId: unknown, childId: unknown, approve: boolean): Promise<Result<{ state: 'opened' | 'waiting' | 'declined' }>> {
  if (typeof connectionId !== 'string' || typeof childId !== 'string') return no('Request not found.');
  if (!juniorsOpen()) return no(JUNIORS_OFF);
  const admin = createAdminClient();
  const { data: conn } = await admin.from('community_connections').select('id, requester_id, addressee_id, status').eq('id', connectionId).maybeSingle();
  if (!conn || conn.status !== 'awaiting_parents') return no('Request not found.');
  const juniors = [conn.requester_id as string, conn.addressee_id as string];
  const { data: link } = await admin.from('parent_child_links').select('verified_at, child_profiles ( linked_user_id )').eq('parent_id', parentId).eq('child_id', childId).not('verified_at', 'is', null).maybeSingle();
  const cp = (link ? (Array.isArray(link.child_profiles) ? link.child_profiles[0] : link.child_profiles) : null) as { linked_user_id: string | null } | null;
  const juniorId = cp?.linked_user_id ?? null;
  // Only a verified parent of one of the two children can decide, and only for that child
  if (!juniorId || !juniors.includes(juniorId) || !(await parentsOf(admin, juniorId)).includes(parentId)) return no('Request not found.');

  await admin.from('community_connection_approvals').upsert({ connection_id: connectionId, junior_id: juniorId, parent_id: parentId, decision: approve ? 'approved' : 'declined', decided_at: new Date().toISOString() });
  await logEvent(admin, connectionId, parentId, juniorId, approve ? 'parent_approved' : 'parent_declined');

  const { data: all } = await admin.from('community_connection_approvals').select('junior_id, decision').eq('connection_id', connectionId);
  const result = outcome(juniors, (all ?? []) as Approval[]);
  if (result === 'waiting') return ok({ state: 'waiting' });

  const stamp = { responded_at: new Date().toISOString() };
  if (result === 'declined') {
    await admin.from('community_connections').update({ status: 'declined', ...stamp }).eq('id', connectionId);
    await logEvent(admin, connectionId, parentId, juniorId, 'declined');
    for (const j of juniors) await notify(admin, j, { kind: 'connect_accepted', title: 'Not this time', body: 'A parent did not approve this connection.', data: { connectionId } });
    return ok({ state: 'declined' });
  }
  await admin.from('community_connections').update({ status: 'accepted', ...stamp }).eq('id', connectionId);
  await logEvent(admin, connectionId, parentId, juniorId, 'accepted');
  for (const j of juniors) await notify(admin, j, { kind: 'connect_accepted', title: 'You are connected', body: 'Both your parents said yes. Say hello.', data: { connectionId } });
  return ok({ state: 'opened' });
}
