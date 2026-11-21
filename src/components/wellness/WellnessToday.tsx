'use client';

import { useState, useTransition } from 'react';
import { saveReadiness, setChecklistTick, type WellnessToday as Today } from '@/lib/actions/wellness';
import { MATCH_DAY_CHECKLISTS } from '@/lib/wellness/content';
import { READINESS_FIELDS, readinessSummary, MAX_NOTE, type ReadinessKey } from '@/lib/wellness/readiness';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 } as const;

export function WellnessToday({ initial }: { initial: Today }) {
  const [saved, setSaved] = useState(initial.readiness);
  const [editing, setEditing] = useState(!initial.readiness);
  const [scores, setScores] = useState<Partial<Record<ReadinessKey, number>>>(initial.readiness ?? {});
  const [notes, setNotes] = useState(initial.readiness?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [ticks, setTicks] = useState(() => new Set(initial.ticks));

  function submit() {
    setError(null);
    start(async () => {
      const res = await saveReadiness({ ...scores, notes });
      if (!res.success) return setError(res.error);
      setSaved({ sleep: scores.sleep!, mood: scores.mood!, soreness: scores.soreness!, stress: scores.stress!, notes: notes.trim() || null });
      setEditing(false);
    });
  }

  function tick(id: string, on: boolean) {
    const prev = ticks;
    setTicks((t) => { const n = new Set(t); if (on) n.add(id); else n.delete(id); return n; });
    start(async () => {
      const res = await setChecklistTick(id, on);
      if (!res.success) { setTicks(prev); setError(res.error); }
    });
  }

  return (
    <section aria-label="Today" style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>How ready are you today?</h2>
        <p style={{ margin: '4px 0 14px', fontSize: 13.5, color: 'rgba(255,255,255,0.6)' }}>Private to you. Not shared with your coach or club. This is general preparation, not a medical or clinical service.</p>
        {saved && !editing ? (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 15 }}>{readinessSummary(saved)}</p>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.65)' }}>
              Sleep {saved.sleep}/5 · Mood {saved.mood}/5 · Soreness {saved.soreness}/5 · Stress {saved.stress}/5
            </p>
            <button type="button" onClick={() => setEditing(true)} style={{ marginTop: 12, background: 'none', color: '#60A5FA', border: 0, cursor: 'pointer', fontSize: 14, padding: 0 }}>Change today&apos;s answers</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {READINESS_FIELDS.map((f) => (
              <fieldset key={f.key} style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.label} <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>(1 = {f.low.toLowerCase()}, 5 = {f.high.toLowerCase()})</span></legend>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = scores[f.key] === n;
                    return (
                      <button key={n} type="button" aria-pressed={on} onClick={() => setScores((s) => ({ ...s, [f.key]: n }))}
                        style={{ width: 44, height: 44, borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', border: on ? '2px solid #F472B6' : '1px solid rgba(255,255,255,0.2)', background: on ? 'rgba(244,114,182,0.18)' : 'transparent', color: '#fff' }}>{n}</button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 700 }}>
              Private note (optional)
              <textarea value={notes} maxLength={MAX_NOTE} onChange={(e) => setNotes(e.target.value)} rows={2}
                style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: '#fff', padding: 10, fontFamily: 'inherit', fontSize: 14 }} />
            </label>
            <div>
              <button type="button" onClick={submit} disabled={pending || READINESS_FIELDS.some((f) => !scores[f.key])}
                style={{ padding: '11px 20px', borderRadius: 10, border: 0, fontWeight: 700, fontSize: 15, cursor: 'pointer', background: '#F472B6', color: '#1A0A14', opacity: pending || READINESS_FIELDS.some((f) => !scores[f.key]) ? 0.5 : 1 }}>
                Save today&apos;s check-in
              </button>
            </div>
          </div>
        )}
        {error && <p role="alert" style={{ margin: '12px 0 0', color: '#FCA5A5', fontSize: 14 }}>{error}</p>}
      </div>

      <div style={card}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Match-day preparation</h2>
        <p style={{ margin: '4px 0 14px', fontSize: 13.5, color: 'rgba(255,255,255,0.6)' }}>Tick things off as you go. Your ticks are saved for today and start fresh tomorrow.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {MATCH_DAY_CHECKLISTS.map((c) => {
            const done = c.items.filter((i) => ticks.has(i.id)).length;
            return (
              <details key={c.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>{c.title} <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>· {done}/{c.items.length}</span></summary>
                <p style={{ margin: '8px 0', fontSize: 13.5, color: 'rgba(255,255,255,0.6)' }}>{c.intro}</p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                  {c.items.map((i) => (
                    <li key={i.id}>
                      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, cursor: 'pointer' }}>
                        <input type="checkbox" checked={ticks.has(i.id)} onChange={(e) => tick(i.id, e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
                        <span>{i.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
