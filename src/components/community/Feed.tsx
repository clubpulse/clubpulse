'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { FeedPost, Comment } from '@/lib/community/service';
import { postAction, likeAction, commentAction, loadCommentsAction, reportContentAction, blockAction } from '@/lib/actions/community-social';
import { ActionButton, ReportButton, cardStyle } from './ui';

const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit' } as const;

function Composer({ placeholder, send, max }: { placeholder: string; send: (t: string) => Promise<{ success: boolean; error?: string; message?: string }>; max: number }) {
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await send(text); setNote(r.success ? (r.message ?? null) : (r.error ?? 'Not posted.')); if (r.success) setText(''); }); }}>
      <textarea style={{ ...field, minHeight: 60 }} maxLength={max} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit" disabled={pending || !text.trim()} style={{ marginTop: 8, background: '#60A5FA', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>{pending ? 'Checking…' : 'Post'}</button>
      {note && <p role="status" style={{ fontSize: 13 }}>{note}</p>}
    </form>
  );
}

function Replies({ postId }: { postId: string }) {
  const [list, setList] = useState<Comment[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <div style={{ marginTop: 10 }}>
      {list === null ? <button type="button" disabled={pending} onClick={() => start(async () => setList(await loadCommentsAction(postId)))} style={{ background: 'none', border: 0, color: '#60A5FA', cursor: 'pointer' }}>Show replies</button> : (
        <>
          {list.map((c) => <p key={c.id} style={{ margin: '6px 0' }}><Link href={`/community/people/${c.author.id}`}>{c.author.name}</Link>: {c.body}{!c.mine && <> <ReportButton run={(reason) => reportContentAction('comment', c.id, reason)} /></>}</p>)}
          <Composer placeholder="Reply" max={300} send={async (t) => { const r = await commentAction(postId, t); if (r.success) setList(await loadCommentsAction(postId)); return r; }} />
        </>
      )}
    </div>
  );
}

export function Feed({ posts, scope, canFilter }: { posts: FeedPost[]; scope: string; canFilter: { miles: boolean; league: boolean; county: boolean } }) {
  const scopes = [['club', 'My club', true], ['miles', 'Near me', canFilter.miles], ['league', 'My league', canFilter.league], ['county', 'My county', canFilter.county], ['all', 'Everyone', true]] as const;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {scopes.filter((s) => s[2]).map(([key, label]) => <Link key={key} href={`/community/feed?scope=${key}`} aria-current={scope === key ? 'page' : undefined} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: scope === key ? 'rgba(96,165,250,0.25)' : 'transparent' }}>{label}</Link>)}
      </div>
      <div style={{ ...cardStyle, marginBottom: 16 }}><Composer placeholder="Share something about your cricket" max={500} send={postAction} /></div>
      {posts.length === 0 && <p>Nothing here yet.</p>}
      {posts.map((p) => (
        <div key={p.id} style={{ ...cardStyle, marginBottom: 12 }}>
          <p style={{ margin: 0 }}><Link href={`/community/people/${p.author.id}`}><strong>{p.author.name}</strong></Link>{p.author.club ? ` · ${p.author.club}` : ''}</p>
          <p>{p.body}</p>
          {p.held && <p style={{ fontSize: 13, opacity: 0.8 }}>Only you can see this while ClubPulse checks it.</p>}
          {!p.held && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <ActionButton quiet label={`${p.liked ? 'Unlike' : 'Like'} (${p.likes})`} run={() => likeAction(p.id)} />
              {!p.mine && <ReportButton run={(reason) => reportContentAction('post', p.id, reason)} />}
              {!p.mine && <ActionButton quiet label="Block" confirm="Block this person?" run={() => blockAction(p.author.id)} />}
            </div>
          )}
          {!p.held && <Replies postId={p.id} />}
        </div>
      ))}
    </div>
  );
}
