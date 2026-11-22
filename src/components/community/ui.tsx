'use client';

import { useState, useTransition, type ReactNode } from 'react';

export const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 } as const;
const btn = { background: '#60A5FA', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600, cursor: 'pointer' } as const;
const ghost = { ...btn, background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.25)' } as const;

type R = { success: boolean; error?: string; message?: string };

/** One button that runs a server action and shows its answer in words. */
export function ActionButton({ label, run, quiet, confirm }: { label: string; run: () => Promise<R>; quiet?: boolean; confirm?: string }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <span>
      <button type="button" style={quiet ? ghost : btn} disabled={pending} onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => { const r = await run(); setNote(r.success ? (r.message ?? null) : (r.error ?? 'Something went wrong.')); });
      }}>{pending ? 'One moment…' : label}</button>
      {note && <span role="status" style={{ marginLeft: 10, fontSize: 13, opacity: 0.8 }}>{note}</span>}
    </span>
  );
}

export function ReportButton({ run }: { run: (reason: string) => Promise<R> }) {
  return <ActionButton label="Report" quiet run={() => { const reason = window.prompt('What is wrong? A few words is fine.') ?? ''; return reason ? run(reason) : Promise.resolve({ success: false, error: 'Cancelled.' }); }} />;
}

export function ClosedNotice({ children }: { children?: ReactNode }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0 }}>The Community is not open yet</h2>
      <p>We are finishing the safeguarding checks before people can connect across clubs. {children}</p>
    </div>
  );
}

export const LOOKING_OPTIONS = [
  { key: 'net_partner', label: 'A net partner' },
  { key: 'club', label: 'A club' },
  { key: 'coach', label: 'A coach' },
  { key: 'teammates', label: 'Teammates' },
] as const;

type ProfileValues = { headline: string; about: string; openToClub: boolean; lookingFor: string[] };

export function ProfileForm({ initial, onSave }: { initial: ProfileValues; onSave: (v: ProfileValues) => Promise<R> }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit', marginBottom: 12 } as const;
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await onSave(v); setNote(r.success ? (r.message ?? 'Saved.') : (r.error ?? 'Could not save.')); }); }}>
      <label>Headline<input style={field} maxLength={80} value={v.headline} onChange={(e) => setV({ ...v, headline: e.target.value })} /></label>
      <label>About you<textarea style={{ ...field, minHeight: 90 }} maxLength={400} value={v.about} onChange={(e) => setV({ ...v, about: e.target.value })} /></label>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 12px' }}>
        <legend style={{ marginBottom: 6 }}>I am looking for</legend>
        {LOOKING_OPTIONS.map((o) => (
          <label key={o.key} style={{ display: 'inline-block', marginRight: 16 }}>
            <input type="checkbox" checked={v.lookingFor.includes(o.key)} onChange={(e) => setV({ ...v, lookingFor: e.target.checked ? [...v.lookingFor, o.key] : v.lookingFor.filter((k) => k !== o.key) })} /> {o.label}
          </label>
        ))}
      </fieldset>
      <label style={{ display: 'block', marginBottom: 12 }}><input type="checkbox" checked={v.openToClub} onChange={(e) => setV({ ...v, openToClub: e.target.checked })} /> Open to hearing from other clubs</label>
      <button type="submit" style={btn} disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</button>
      {note && <p role="status">{note}</p>}
    </form>
  );
}
