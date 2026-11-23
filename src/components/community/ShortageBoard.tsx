'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { closeShortageAction, postShortageAction, replyShortageAction, reportContentAction, shortageRepliesAction } from '@/lib/actions/community-social';
import { ActionButton, ReportButton } from './ui';
import { connectAction } from '@/lib/actions/community-social';

export type Shortage = { id: string; club: string; clubId: string; format: string; playAt: string; need: number; place: string; note: string; distance: string | null; mine: boolean; replied: boolean; replies: number; canReply: boolean };
const FORMAT: Record<string, string> = { league: 'League game', friendly: 'Friendly', t20: 'T20', indoor: 'Indoor' };
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit', marginBottom: 10 } as const;

function Replies({ id }: { id: string }) {
  const [list, setList] = useState<Array<{ id: string; name: string; club: string | null }> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div style={{ marginTop: 8 }}>
      {!list ? <ActionButton quiet label="See who can play" run={async () => { const r = await shortageRepliesAction(id); if (r.success) setList(r.replies ?? []); else setMsg(r.error ?? null); return { success: r.success, error: r.error }; }} /> : (
        list.length === 0 ? <p style={{ margin: 0 }}>Nobody yet.</p> : list.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <Link href={`/community/people/${p.id}`}>{p.name}{p.club ? ` · ${p.club}` : ''}</Link>
            <ActionButton quiet label="Connect" run={connectAction.bind(null, p.id, true)} />
          </div>
        ))
      )}
      {msg && <p role="alert">{msg}</p>}
    </div>
  );
}

export function ShortageList({ shortages }: { shortages: Shortage[] }) {
  if (shortages.length === 0) return <p>No clubs are short of players near you right now.</p>;
  return (
    <div>
      {shortages.map((s) => (
        <div key={s.id} style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, marginBottom: 12, background: 'rgba(255,255,255,0.04)' }}>
          <strong>{s.club}</strong> needs {s.need} player{s.need === 1 ? '' : 's'}
          <div style={{ opacity: 0.75 }}>{FORMAT[s.format] ?? s.format} · {when(s.playAt)}{s.distance ? ` · ${s.distance}` : ''}</div>
          <div>{s.place}</div>
          {s.note && <p style={{ margin: '6px 0 0' }}>{s.note}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {s.canReply && <ActionButton label="I can play" run={replyShortageAction.bind(null, s.id, true)} />}
            {s.replied && <ActionButton quiet label="I can’t play after all" run={replyShortageAction.bind(null, s.id, false)} />}
            {!s.mine && <ReportButton run={(reason) => reportContentAction('shortage', s.id, reason)} />}
            {s.mine && <>
              <ActionButton quiet label="Filled" run={closeShortageAction.bind(null, s.id, 'filled')} />
              <ActionButton quiet label="Cancel" confirm="Cancel this post?" run={closeShortageAction.bind(null, s.id, 'cancelled')} />
            </>}
          </div>
          {s.mine && <Replies id={s.id} />}
        </div>
      ))}
    </div>
  );
}

export function ShortageForm({ clubs }: { clubs: Array<{ id: string; name: string }> }) {
  const [v, setV] = useState({ clubId: clubs[0]?.id ?? '', format: 'league', need: 2, place: '', playAt: '', note: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await postShortageAction({ ...v, playAt: v.playAt ? new Date(v.playAt).toISOString() : '' }); setMsg(r.success ? (r.message ?? 'Posted.') : (r.error ?? 'Could not post.')); }); }}>
      {clubs.length > 1 && <select style={field} value={v.clubId} onChange={(e) => setV({ ...v, clubId: e.target.value })}>{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      <select style={field} value={v.format} onChange={(e) => setV({ ...v, format: e.target.value })}><option value="league">League game</option><option value="friendly">Friendly</option><option value="t20">T20</option><option value="indoor">Indoor</option></select>
      <input style={field} type="datetime-local" value={v.playAt} onChange={(e) => setV({ ...v, playAt: e.target.value })} aria-label="When" />
      <input style={field} type="number" min={1} max={6} value={v.need} onChange={(e) => setV({ ...v, need: Number(e.target.value) })} aria-label="Players needed" />
      <input style={field} placeholder="Where (club ground or public venue)" maxLength={120} value={v.place} onChange={(e) => setV({ ...v, place: e.target.value })} />
      <textarea style={{ ...field, minHeight: 60 }} placeholder="Anything players should know (standard, kit, directions)" maxLength={300} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      <button type="submit" disabled={pending} style={{ background: '#60A5FA', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>{pending ? 'Checking…' : 'Post the game'}</button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
