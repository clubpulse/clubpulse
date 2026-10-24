'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type { PlayerLegacy, LegacyStatus } from '@/lib/types/legacy';
import { STATUS_CONFIG } from '@/lib/types/legacy';
import { adminUpsertLegacy } from '@/lib/actions/legacy';

type FormData = { user_id: string; club_id: string; display_name: string; nickname: string; years_at_club: string; primary_role: string; status: LegacyStatus; career_summary: string; career_highlight: string; best_season: string; total_matches: string; total_runs: string; total_wickets: string; quote: string; photo_url: string; is_published: boolean; honours: string[]; };

function fromLegacy(l: PlayerLegacy | null, clubId: string): FormData {
  return { user_id: l?.user_id ?? '', club_id: l?.club_id ?? clubId, display_name: l?.display_name ?? '', nickname: l?.nickname ?? '', years_at_club: l?.years_at_club ?? '', primary_role: l?.primary_role ?? '', status: l?.status ?? 'active', career_summary: l?.career_summary ?? '', career_highlight: l?.career_highlight ?? '', best_season: l?.best_season ?? '', total_matches: l?.total_matches?.toString() ?? '', total_runs: l?.total_runs?.toString() ?? '', total_wickets: l?.total_wickets?.toString() ?? '', quote: l?.quote ?? '', photo_url: l?.photo_url ?? '', is_published: l?.is_published ?? false, honours: l?.honours ?? [] };
}

const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' };
function F({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ display: 'flex', flexDirection: 'column' }}><label style={lbl}>{label}</label>{children}</div>; }

export function LegacyForm({ clubId, initial, onSuccess }: { clubId: string; initial?: PlayerLegacy | null; onSuccess?: (l: PlayerLegacy) => void }) {
  const [form, setForm] = useState<FormData>(() => fromLegacy(initial ?? null, clubId));
  const [honourInput, setHonourInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function set(field: keyof FormData, value: string | boolean | string[]) { setForm((p) => ({ ...p, [field]: value })); }
  function addHonour() { const t = honourInput.trim(); if (!t || form.honours.includes(t)) return; set('honours', [...form.honours, t]); setHonourInput(''); }
  function removeHonour(h: string) { set('honours', form.honours.filter((x) => x !== h)); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    startTransition(async () => {
      const result = await adminUpsertLegacy({ user_id: form.user_id, club_id: form.club_id, display_name: form.display_name, nickname: form.nickname || undefined, years_at_club: form.years_at_club, primary_role: form.primary_role, status: form.status, career_summary: form.career_summary, career_highlight: form.career_highlight || undefined, best_season: form.best_season || undefined, total_matches: form.total_matches ? parseInt(form.total_matches, 10) : undefined, total_runs: form.total_runs ? parseInt(form.total_runs, 10) : undefined, total_wickets: form.total_wickets ? parseInt(form.total_wickets, 10) : undefined, honours: form.honours.length > 0 ? form.honours : undefined, quote: form.quote || undefined, photo_url: form.photo_url || undefined, is_published: form.is_published });
      if (!result.success) { setError(result.error ?? 'Unknown error'); return; }
      onSuccess?.(result.data);
    });
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <F label="User ID *"><input style={inp} value={form.user_id} onChange={(e) => set('user_id', e.target.value)} required placeholder="auth user UUID" /></F>
        <F label="Display name *"><input style={inp} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} required /></F>
        <F label="Nickname"><input style={inp} value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder='e.g. "The Wall"' /></F>
        <F label="Years at club *"><input style={inp} value={form.years_at_club} onChange={(e) => set('years_at_club', e.target.value)} required placeholder="e.g. 2018–2025" /></F>
        <F label="Primary role *"><input style={inp} value={form.primary_role} onChange={(e) => set('primary_role', e.target.value)} required placeholder="e.g. Opening Batsman" /></F>
        <F label="Status *">
          <select style={{ ...inp, cursor: 'pointer' }} value={form.status} onChange={(e) => set('status', e.target.value as LegacyStatus)}>
            {(Object.keys(STATUS_CONFIG) as LegacyStatus[]).map((s) => <option key={s} value={s} style={{ background: '#1a1a1a' }}>{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}</option>)}
          </select>
        </F>
      </div>
      <F label="Career summary *"><textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={form.career_summary} onChange={(e) => set('career_summary', e.target.value)} required placeholder="2–3 sentences about this player's time at the club" /></F>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <F label="Career highlight"><input style={inp} value={form.career_highlight} onChange={(e) => set('career_highlight', e.target.value)} placeholder="e.g. Match-winning century in the 2023 cup final" /></F>
        <F label="Best season"><input style={inp} value={form.best_season} onChange={(e) => set('best_season', e.target.value)} placeholder="e.g. 2022 — 847 runs at 56 avg" /></F>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <F label="Total matches"><input style={inp} type="number" min={0} value={form.total_matches} onChange={(e) => set('total_matches', e.target.value)} /></F>
        <F label="Total runs"><input style={inp} type="number" min={0} value={form.total_runs} onChange={(e) => set('total_runs', e.target.value)} /></F>
        <F label="Total wickets"><input style={inp} type="number" min={0} value={form.total_wickets} onChange={(e) => set('total_wickets', e.target.value)} /></F>
      </div>
      <F label="Honours">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...inp, flex: 1 }} value={honourInput} onChange={(e) => setHonourInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHonour(); } }} placeholder="e.g. Player of the Year 2022" />
          <button type="button" onClick={addHonour} style={{ ...inp, width: 'auto', padding: '8px 14px', cursor: 'pointer', background: 'rgba(155,28,28,0.3)', border: '1px solid rgba(155,28,28,0.5)' }}>Add</button>
        </div>
        {form.honours.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{form.honours.map((h) => <span key={h} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 20, background: 'rgba(155,28,28,0.2)', color: 'rgba(252,165,165,0.85)', border: '1px solid rgba(155,28,28,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>{h}<button type="button" onClick={() => removeHonour(h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(252,165,165,0.5)', padding: 0, lineHeight: 1 }}>×</button></span>)}</div>}
      </F>
      <F label="Player quote"><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.quote} onChange={(e) => set('quote', e.target.value)} placeholder="A memorable quote from the player" /></F>
      <F label="Photo URL"><input style={inp} type="url" value={form.photo_url} onChange={(e) => set('photo_url', e.target.value)} placeholder="https://..." /></F>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
        <input type="checkbox" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#9b1c1c', cursor: 'pointer' }} />
        Publish to Club Alumni wall
      </label>
      {error && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" loading={isPending}>{initial ? 'Save changes' : 'Create legacy'}</Button>
      </div>
    </form>
  );
}
