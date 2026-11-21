'use client';

import { useState, useTransition } from 'react';
import { confirmXI, type SelectionRow } from '@/lib/actions/xi-selection';
import type { AvailabilityStatus } from '@/lib/types/availability';
import { MAX_XI } from '@/lib/xi-selection/logic';

const FORMAT_LABELS: Record<string, string> = { league: 'League', cup: 'Cup', friendly: 'Friendly', tour: 'Tour' };
const DOT: Record<AvailabilityStatus, { bg: string; label: string }> = {
  available: { bg: '#16a34a', label: 'Available' },
  maybe: { bg: '#d97706', label: 'Maybe' },
  unknown: { bg: 'rgba(255,255,255,0.2)', label: 'No response' },
  unavailable: { bg: '#dc2626', label: 'Unavailable' },
};
const ORDER: Record<AvailabilityStatus, number> = { available: 0, maybe: 1, unknown: 2, unavailable: 3 };

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** One fixture: tap players to pick the XI, optionally a twelfth man, then confirm. */
export function XISelector({ row }: { row: SelectionRow }) {
  const [picked, setPicked] = useState<string[]>(row.selection?.selected_players ?? []);
  const [twelfth, setTwelfth] = useState<string | null>(row.selection?.twelfth_man ?? null);
  const [notes, setNotes] = useState(row.selection?.notes ?? '');
  const [saved, setSaved] = useState<boolean>(!!row.selection);
  const [message, setMessage] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = new Map(row.players.map((p) => [p.user_id, p]));
  const sorted = row.players.slice().sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.display_name.localeCompare(b.display_name));
  const name = (id: string) => byId.get(id)?.display_name ?? 'Unknown';

  function toggle(id: string) {
    setSaved(false);
    setMessage(null);
    if (picked.includes(id)) {
      setPicked(picked.filter((x) => x !== id));
    } else {
      if (picked.length >= MAX_XI) {
        setMessage({ kind: 'err', text: `The XI is full (${MAX_XI}). Remove someone first.` });
        return;
      }
      if (twelfth === id) setTwelfth(null);
      setPicked([...picked, id]);
    }
  }

  function confirm() {
    setMessage(null);
    startTransition(async () => {
      const res = await confirmXI({ fixtureId: row.id, players: picked, twelfthMan: twelfth, notes });
      if (!res.success) {
        setMessage({ kind: 'err', text: res.error ?? 'Could not save the XI.' });
        return;
      }
      setSaved(true);
      setMessage(
        res.warnings && res.warnings.length > 0
          ? { kind: 'warn', text: `Saved. ${res.warnings.join(' ')}` }
          : { kind: 'ok', text: 'XI confirmed. Players can now see it.' },
      );
    });
  }

  const benchChoices = sorted.filter((p) => !picked.includes(p.user_id) && p.status !== 'unavailable');
  const colour = message?.kind === 'ok' ? '#4ade80' : message?.kind === 'warn' ? '#fbbf24' : '#f87171';

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {FORMAT_LABELS[row.format] ?? row.format}
          </span>
          <h2 style={{ margin: '1px 0 0', fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Bricolage Grotesque', sans-serif" }}>vs {row.opponent}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {formatDate(row.match_date)}{row.venue ? ` · ${row.venue}` : ''}
          </p>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>
          <div>
            {row.counts.available} available · {row.counts.maybe} maybe · {row.counts.unavailable} unavailable · {row.counts.unknown} no reply
          </div>
          <div style={{ marginTop: 4, fontWeight: 700, color: picked.length === MAX_XI ? '#4ade80' : '#fff' }}>
            XI {picked.length}/{MAX_XI}{saved ? ' · confirmed' : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 16px' }}>
        {sorted.map((p) => {
          const on = picked.includes(p.user_id);
          const dot = DOT[p.status];
          return (
            <button
              key={p.user_id}
              type="button"
              onClick={() => toggle(p.user_id)}
              aria-pressed={on}
              title={`${p.display_name}: ${dot.label}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                background: on ? 'rgba(37,99,235,0.28)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${on ? '#60A5FA' : 'rgba(255,255,255,0.07)'}`,
                opacity: p.status === 'unavailable' && !on ? 0.55 : 1,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot.bg, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: on ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: on ? 700 : 500, whiteSpace: 'nowrap' }}>
                {on ? '✓ ' : ''}{p.display_name}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)', flexWrap: 'wrap' }}>
          Twelfth man
          <select
            value={twelfth ?? ''}
            onChange={(e) => { setTwelfth(e.target.value || null); setSaved(false); setMessage(null); }}
            style={{ background: '#0B1220', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}
          >
            <option value="">None</option>
            {twelfth && !benchChoices.some((p) => p.user_id === twelfth) && <option value={twelfth}>{name(twelfth)}</option>}
            {benchChoices.map((p) => <option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}
          </select>
        </label>
        <input
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          placeholder="Note for the team (optional), e.g. meet at 12:00"
          maxLength={200}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#fff' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={confirm}
            disabled={pending || picked.length === 0}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: picked.length === 0 ? 'rgba(255,255,255,0.1)' : '#2563EB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: pending || picked.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            {pending ? 'Saving…' : row.selection || saved ? 'Update XI' : 'Confirm XI'}
          </button>
          {message && <span role="status" style={{ fontSize: 12, color: colour }}>{message.text}</span>}
        </div>
        {saved && picked.length > 0 && (
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            <strong style={{ color: '#fff' }}>XI:</strong> {picked.map(name).join(', ')}
            {twelfth ? <> · <strong style={{ color: '#fff' }}>12th:</strong> {name(twelfth)}</> : null}
          </p>
        )}
      </div>
    </div>
  );
}
