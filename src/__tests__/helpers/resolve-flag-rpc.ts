/* eslint-disable @typescript-eslint/no-explicit-any */
// A stand-in for resolve_age_squad_flag() that follows the SQL in migration 20261130000008: the same refusals, one
// all-or-nothing change. The real function is run against Postgres in view-rls.sql. This lets the app code be tested.
import { statedb, type Row } from './statedb';

const today = () => new Date().toISOString().slice(0, 10);
const yearsAgo = (date: string, years: number, months = 0) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

function leadActive(userId: string): boolean {
  const row = (statedb.tables.platform_safeguarding_leads ?? []).find((r) => r.user_id === userId);
  if (!row || row.revoked_at) return false;
  const t = today();
  return !!row.dbs_checked_on && row.dbs_checked_on <= t && yearsAgo(row.dbs_checked_on, 3) > t
    && !!row.training_completed_on && row.training_completed_on <= t && yearsAgo(row.training_completed_on, 0, 12) > t;
}

export function installResolveFlagRpc() {
  statedb.rpcs.resolve_age_squad_flag = (a: Record<string, any>) => {
    const fail = (message: string, code = 'P0001') => ({ data: null, error: { message, code } });
    if (statedb.failOn === 'age_squad_mismatches') return fail('boom');
    const flags: Row[] = statedb.tables.age_squad_mismatches ?? [];
    const flag = flags.find((f) => f.id === a.p_flag && f.club_id === a.p_club && f.resolved_at == null);
    if (!flag) return fail('flag is not open', 'P0002');
    const members: Row[] = statedb.tables.club_members ?? [];
    const incidents: Row[] = statedb.tables.safeguarding_incidents ?? [];
    if (a.p_via === 'platform_lead') {
      if (!leadActive(a.p_resolver)) return fail('not an active safeguarding lead', '42501');
      if (!a.p_note || !String(a.p_note).trim()) return fail('a lead must record why the flag is closed');
      if (flag.user_id === a.p_resolver) return fail('conflict of interest', '42501');
      if (members.some((m) => m.club_id === a.p_club && m.user_id === a.p_resolver && m.is_active)) return fail('conflict of interest', '42501');
      const incident = incidents.find((i) => i.id === flag.incident_id);
      if (incident && incident.reported_by === a.p_resolver) return fail('conflict of interest', '42501');
      if (members.some((m) => m.club_id === a.p_club && m.role === 'welfare_officer' && m.is_active)) return fail('this club has a welfare officer', '42501');
    }
    const before = JSON.stringify({ f: flags, i: incidents, a: statedb.tables.safeguarding_lead_audit ?? [] });
    const stamp = new Date().toISOString();
    Object.assign(flag, { resolved_at: stamp, resolved_by: a.p_resolver, resolved_via: a.p_via, resolution_note: a.p_note?.trim() || null });
    if (flag.incident_id) {
      const incident = incidents.find((i) => i.id === flag.incident_id && i.club_id === a.p_club);
      if (!incident || statedb.failOn === 'safeguarding_incidents') {
        const saved = JSON.parse(before);
        statedb.tables.age_squad_mismatches = saved.f;
        statedb.tables.safeguarding_incidents = saved.i;
        statedb.tables.safeguarding_lead_audit = saved.a;
        return fail('the linked safeguarding incident could not be updated');
      }
      Object.assign(incident, { status: 'resolved', resolved_at: stamp, updated_at: stamp });
    }
    if (a.p_via === 'platform_lead') {
      (statedb.tables.safeguarding_lead_audit ??= []).push({ id: `a-${Math.random()}`, lead_id: a.p_resolver, action: 'resolve', club_id: a.p_club, flag_ids: [a.p_flag], note: String(a.p_note).trim(), at: stamp });
    }
    return { data: flag.incident_id ?? null, error: null };
  };
}
