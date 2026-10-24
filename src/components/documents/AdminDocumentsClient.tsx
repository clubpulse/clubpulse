'use client';

import { useState, useTransition } from 'react';
import { adminAddDocument, adminDeactivateDocument, adminUpdateDocument } from '@/lib/actions/documents';
import { CATEGORY_CONFIG, type ClubDocument, type DocumentCategory } from '@/lib/types/documents';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as DocumentCategory[];

interface AckInfo {
  total: number;
  acked: number;
  unacked: { user_id: string; display_name: string | null }[];
}

interface Props {
  clubId: string;
  initialDocs: ClubDocument[];
  ackMap: Record<string, AckInfo>;
}

const emptyForm = {
  title: '',
  description: '',
  category: 'other' as DocumentCategory,
  file_url: '',
  version: '',
  is_mandatory: false,
};

function labelStyle(): React.CSSProperties {
  return { fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  };
}

export function AdminDocumentsClient({ clubId, initialDocs, ackMap }: Props) {
  const [docs, setDocs] = useState<ClubDocument[]>(initialDocs);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAck, setExpandedAck] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function startEdit(doc: ClubDocument) {
    setForm({
      title: doc.title,
      description: doc.description ?? '',
      category: doc.category,
      file_url: doc.file_url,
      version: doc.version ?? '',
      is_mandatory: doc.is_mandatory,
    });
    setEditingId(doc.id);
    setShowForm(true);
  }

  function handleSubmit() {
    setError(null);
    if (!form.title.trim() || !form.file_url.trim()) {
      setError('Title and File URL are required.');
      return;
    }
    startTransition(async () => {
      if (editingId) {
        const result = await adminUpdateDocument(editingId, {
          title: form.title,
          description: form.description || undefined,
          category: form.category,
          file_url: form.file_url,
          version: form.version || undefined,
          is_mandatory: form.is_mandatory,
        });
        if (!result.success) { setError(result.error); return; }
        setDocs((prev) => prev.map((d) => d.id === editingId ? result.data : d));
      } else {
        const result = await adminAddDocument({
          club_id: clubId,
          title: form.title,
          description: form.description || undefined,
          category: form.category,
          file_url: form.file_url,
          version: form.version || undefined,
          is_mandatory: form.is_mandatory,
        });
        if (!result.success) { setError(result.error); return; }
        setDocs((prev) => [result.data, ...prev]);
      }
      resetForm();
    });
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      const result = await adminDeactivateDocument(id);
      if (result.success) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      }
    });
  }

  const sectionHeader = (text: string) => (
    <h2 style={{
      fontFamily: "'Syne', sans-serif",
      fontWeight: 700,
      fontSize: '14px',
      color: 'rgba(255,255,255,0.7)',
      margin: '0 0 12px',
    }}>{text}</h2>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Add / Edit form toggle */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            alignSelf: 'flex-start',
            padding: '9px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(155,28,28,0.5)',
            background: 'rgba(155,28,28,0.2)',
            color: '#fff',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Document
        </button>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {sectionHeader(editingId ? 'Edit Document' : 'Add Document')}

          <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <label style={labelStyle()}>Title *</label>
              <input
                style={inputStyle()}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Club Constitution 2025"
              />
            </div>
            <div>
              <label style={labelStyle()}>Version</label>
              <input
                style={inputStyle()}
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="e.g. v2.1"
              />
            </div>
            <div>
              <label style={labelStyle()}>Category</label>
              <select
                style={{ ...inputStyle(), appearance: 'none' }}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as DocumentCategory }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: '#1a1a1a' }}>
                    {CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle()}>File URL *</label>
              <input
                style={inputStyle()}
                value={form.file_url}
                onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label style={labelStyle()}>Description</label>
            <textarea
              style={{ ...inputStyle(), minHeight: '72px', resize: 'vertical' }}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional summary of what this document covers."
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_mandatory}
              onChange={(e) => setForm((f) => ({ ...f, is_mandatory: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: '#9b1c1c', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontFamily: "'Inter', sans-serif" }}>
              Mandatory — members must acknowledge they have read this
            </span>
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
                color: '#fff',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Document'}
            </button>
            <button
              onClick={resetForm}
              disabled={isPending}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Documents list */}
      {docs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '14px',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
            No documents yet. Add the first one above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sectionHeader(`All Documents (${docs.length})`)}
          {docs.map((doc) => {
            const cat = CATEGORY_CONFIG[doc.category];
            const ack = ackMap[doc.id];
            const isExpanded = expandedAck === doc.id;
            return (
              <div key={doc.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" }}>
                        {doc.title}
                      </span>
                      {doc.version && (
                        <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
                          {doc.version}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
                        {cat.label}
                      </span>
                      {doc.is_mandatory && (
                        <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontFamily: "'Inter', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          Mandatory
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                        {doc.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '5px 12px', borderRadius: '7px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', fontFamily: "'Inter', sans-serif", textDecoration: 'none' }}
                    >
                      View ↗
                    </a>
                    <button
                      onClick={() => startEdit(doc)}
                      style={{ padding: '5px 12px', borderRadius: '7px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(doc.id)}
                      disabled={isPending}
                      style={{ padding: '5px 12px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: isPending ? 'not-allowed' : 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Acknowledgement status for mandatory docs */}
                {doc.is_mandatory && ack && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          height: '6px',
                          width: '80px',
                          borderRadius: '3px',
                          background: 'rgba(255,255,255,0.1)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: ack.total > 0 ? `${(ack.acked / ack.total) * 100}%` : '0%',
                            background: '#4ade80',
                            borderRadius: '3px',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
                          {ack.acked} / {ack.total} members acknowledged
                        </span>
                      </div>
                      {ack.unacked.length > 0 && (
                        <button
                          onClick={() => setExpandedAck(isExpanded ? null : doc.id)}
                          style={{ fontSize: '11px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif", padding: 0 }}
                        >
                          {isExpanded ? 'Hide' : `Show ${ack.unacked.length} who haven't read`}
                        </button>
                      )}
                    </div>
                    {isExpanded && ack.unacked.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {ack.unacked.map((m) => (
                          <span key={m.user_id} style={{
                            fontSize: '11px',
                            padding: '2px 9px',
                            borderRadius: '20px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171',
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            {m.display_name ?? m.user_id.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
