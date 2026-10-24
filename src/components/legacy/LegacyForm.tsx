'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type { PlayerLegacy, LegacyStatus } from '@/lib/types/legacy';
import { STATUS_CONFIG } from '@/lib/types/legacy';
import { adminUpsertLegacy } from '@/lib/actions/legacy';

type FormData = {
  user_id: string;
  club_id: string;
  display_name: string;
  nickname: string;
  years_at_club: string;
  primary_role: string;
  status: LegacyStatus;
  career_summary: string;
  career_highlight: string;
  best_season: string;
  total_matches: string;
  total_runs: string;
  total_wickets: string;
  quote: string;
  photo_url: string;
  is_published: boolean;
  honours: string[];
};

function fromLegacy(legacy: PlayerLegacy | null, clubId: string): FormData {
  return {
    user_id:          legacy?.user_id ?? '',
    club_id:          legacy?.club_id ?? clubId,
    display_name:     legacy?.display_name ?? '',
    nickname:         legacy?.nickname ?? '',
    years_at_club:    legacy?.years_at_club ?? '',
    primary_role:     legacy?.primary_role ?? '',
    status:           legacy?.status ?? 'active',
    career_summary:   legacy?.career_summary ?? '',
    career_highlight: legacy?.career_highlight ?? '',
    best_season:      legacy?.best_season ?? '',
    total_matches:    legacy?.total_matches?.toString() ?? '',
    total_runs:       legacy?.total_runs?.toString() ?? '',
    total_wickets:    legacy?.total_wickets?.toString() ?? '',
    quote:            legacy?.quote ?? '',
    photo_url:        legacy?.photo_url ?? '',
    is_published:     legacy?.is_published ?? false,
    honours:          legacy?.honours ?? [],
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  padding: '8px 12px', color: '#fff', fontSize: 13,
  fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function LegacyForm({
  clubId,
  initial,
  onSuccess,
}: {
  clubId: string;
  initial?: PlayerLegacy | null;
  onSuccess?: (legacy: PlayerLegacy) => void;
}) {
  const [form, setForm] = useState<FormData>(() => fromLegacy(initial ?? null, clubId));
  const [honourInput, setHonourInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set(field: keyof FormData, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addHonour() {
    const trimmed = honourInput.trim();
    if (!trimmed || form.honours.includes(trimmed)) return;
    set('honours', [...form.honours, trimmed]);
    setHonourInput('');
  }

  function removeHonour(h: string) {
    set('honours', form.honours.filter((x) => x !== h));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await adminUpsertLegacy({
        user_id:          form.user_id,
        club_id:          form.club_id,
        display_name:     form.display_name,
        nickname:         form.nickname || undefined,
        years_at_club:    form.years_at_club,
        primary_role:     form.primary_role,
        status:           form.status,
        career_summary:   form.career_summary,
        career_highlight: form.career_highlight || undefined,
        best_season:      form.best_season || undefined,
        total_matches:    form.total_matches ? parseInt(form.total_matches, 10) : undefined,
        total_runs:       form.total_runs ? parseInt(form.total_runs, 10) : undefined,
        total_wickets:    form.total_wickets ? parseInt(form.total_wickets, 10) : undefined,
        honours:          form.honours.length > 0 ? form.honours : undefined,
        quote:            form.quote || undefined,
        photo_url:        form.photo_url || undefined,
        is_published:     form.is_published,
      });
      if (!result.success) { setError(result.error ?? 'Unknown error'); return; }
      onSuccess?.(result.data);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="User ID *">
          <input style={inputStyle} value={form.user_id} onChange={(e) => set('user_id', e.target.value)} required placeholder="auth user UUID" />
        </Field>
        <Field label="Display name *">
          <input style={inputStyle} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} required />
        </Field>
        <Field label="Nickname">
          <input style={inputStyle} value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder='e.g. "The Wall"' />
        </Field>
        <Field label="Years at club *">
          <input style={inputStyle} value={form.years_at_club} onChange={(e) => set('years_at_club', e.target.value)} required placeholder="e.g. 2018–2025" />
        </Field>
        <Field label="Primary role *">
          <input style={inputStyle} value={form.primary_role} onChange={(e) => set('primary_role', e.target.value)} required placeholder="e.g. Opening Batsman" />
        </Field>
        <Field label="Status *">
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={(e) => set('status', e.target.value as LegacyStatus)}>
            {(Object.keys(STATUS_CONFIG) as LegacyStatus[]).map((s) => (
              <option key={s} value={s} style={{ background: '#1a1a1a' }}>
                {STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Career summary *">
        <textarea
          style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
          value={form.career_summary}
          onChange={(e) => set('career_summary', e.target.value)}
          required
          placeholder="2–3 sentences about this player's time at the club"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Career highlight">
          <input style={inputStyle} value={form.career_highlight} onChange={(e) => set('career_highlight', e.target.value)} placeholder="e.g. Match-winning century in the 2023 cup final" />
        </Field>
        <Field label="Best season">
          <input style={inputStyle} value={form.best_season} onChange={(e) => set('best_season', e.target.value)} placeholder="e.g. 2022 — 847 runs at 56 avg" />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Total matches">
          <input style={inputStyle} type="number" min={0} value={form.total_matches} onChange={(e) => set('total_matches', e.target.value)} />
        </Field>
        <Field label="Total runs">
          <input style={inputStyle} type="number" min={0} value={form.total_runs} onChange={(e) => set('total_runs', e.target.value)} />
        </Field>
        <Field label="Total wickets">
          <input style={inputStyle} type="number" min={0} value={form.total_wickets} onChange={(e) => set('total_wickets', e.target.value)} />
        </Field>
      </div>

      <Field label="Honours">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={honourInput}
            onChange={(e) => setHonourInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHonour(); } }}
            placeholder="e.g. Player of the Year 2022"
          />
          <button type="button" onClick={addHonour} style={{ ...inputStyle, width: 'auto', padding: '8px 14px', cursor: 'pointer', background: 'rgba(155,28,28,0.3)', border: '1px solid rgba(155,28,28,0.5)' }}>
            Add
          </button>
        </div>
        {form.honours.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {form.honours.map((h) => (
              <span key={h} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 20, background: 'rgba(155,28,28,0.2)', color: 'rgba(252,165,165,0.85)', border: '1px solid rgba(155,28,28,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {h}
                <button type="button" onClick={() => removeHonour(h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(252,165,165,0.5)', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <Field label="Player quote">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.quote} onChange={(e) => set('quote', e.target.value)} placeholder="A memorable quote from the player" />
      </Field>

      <Field label="Photo URL">
        <input style={inputStyle} type="url" value={form.photo_url} onChange={(e) => set('photo_url', e.target.value)} placeholder="https://..." />
      </Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
        <input type="checkbox" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#9b1c1c', cursor: 'pointer' }} />
        Publish to Club Alumni wall
      </label>

      {error && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" loading={isPending}>
          {initial ? 'Save changes' : 'Create legacy'}
        </Button>
      </div>
    </form>
  );
}
