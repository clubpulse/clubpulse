'use client';

import { useState, useTransition } from 'react';
import { adminCreateNotice, adminDeleteNotice, adminTogglePin } from '@/lib/actions/notices';
import type { Notice, NoticePriority } from '@/lib/types/notices';
import { PRIORITY_CONFIG } from '@/lib/types/notices';
import { useRouter } from 'next/navigation';

interface Props {
  clubId: string;
  notices: Notice[];
}

const PRIORITY_OPTIONS: NoticePriority[] = ['urgent', 'normal', 'info'];

export function NoticeboardAdminClient({ clubId, notices }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!title.trim() || !body.trim()) {
      setFormError('Title and body are required.');
      return;
    }
    startTransition(async () => {
      const result = await adminCreateNotice({
        club_id: clubId,
        title: title.trim(),
        body: body.trim(),
        priority,
        is_pinned: isPinned,
        expires_at: expiresAt || undefined,
      });
      if (result.success) {
        setTitle('');
        setBody('');
        setPriority('normal');
        setIsPinned(false);
        setExpiresAt('');
        setFormSuccess('Notice posted.');
        router.refresh();
      } else {
        setFormError(result.error ?? 'Failed to post notice.');
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await adminDeleteNotice(id);
      router.refresh();
    });
  }

  async function handleTogglePin(id: string, current: boolean) {
    startTransition(async () => {
      await adminTogglePin(id, !current);
      router.refresh();
    });
  }

  const inputStyle: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    padding: '10px 12px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '24px', color: '#fff', margin: '0 0 4px',
        }}>
          📋 Noticeboard
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Post and manage club notices
        </p>
      </div>

      {/* Post form */}
      <form onSubmit={handleCreate} style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
          Post a notice
        </h2>

        <div>
          <label style={labelStyle}>Title</label>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AGM — Saturday 15 November"
            maxLength={200}
          />
        </div>

        <div>
          <label style={labelStyle}>Body</label>
          <textarea
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Details of the notice…"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Priority</label>
            <select
              style={inputStyle}
              value={priority}
              onChange={(e) => setPriority(e.target.value as NoticePriority)}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_CONFIG[p].emoji} {PRIORITY_CONFIG[p].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Expires (optional)</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#9b1c1c' }}
          />
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>📌 Pin to top of noticeboard</span>
        </label>

        {formError && (
          <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>{formError}</p>
        )}
        {formSuccess && (
          <p style={{ margin: 0, fontSize: '13px', color: '#4ade80' }}>{formSuccess}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            background: '#9b1c1c',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
            alignSelf: 'flex-start',
          }}
        >
          {isPending ? 'Posting…' : 'Post notice'}
        </button>
      </form>

      {/* All notices */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700,
          fontSize: '16px', color: '#fff', margin: 0,
        }}>
          All notices ({notices.length})
        </h2>

        {notices.length === 0 && (
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            No notices yet.
          </p>
        )}

        {notices.map((notice) => {
          const cfg = PRIORITY_CONFIG[notice.priority];
          const isExpired = notice.expires_at ? new Date(notice.expires_at) < new Date() : false;
          return (
            <div key={notice.id} style={{
              background: '#0f0f0f',
              border: `1px solid ${isExpired ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              opacity: isExpired ? 0.5 : 1,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '999px',
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.6)',
                    textTransform: 'uppercase',
                  }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  {notice.is_pinned && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>📌 Pinned</span>
                  )}
                  {isExpired && (
                    <span style={{ fontSize: '11px', color: '#f87171' }}>Expired</span>
                  )}
                </div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{notice.title}</p>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap' }}>{notice.body}</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  Posted {new Date(notice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {notice.expires_at && ` · Expires ${new Date(notice.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => handleTogglePin(notice.id, notice.is_pinned)}
                  disabled={isPending}
                  title={notice.is_pinned ? 'Unpin' : 'Pin'}
                  style={{
                    background: notice.is_pinned ? 'rgba(155,28,28,0.2)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                  }}
                >
                  📌
                </button>
                <button
                  onClick={() => handleDelete(notice.id)}
                  disabled={isPending}
                  title="Delete"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '16px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
