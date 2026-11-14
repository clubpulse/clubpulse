'use client';

import { useState, useTransition } from 'react';
import { LegacyCard } from './LegacyCard';
import { LegacyForm } from './LegacyForm';
import { Button } from '@/components/ui/Button';
import { adminPublishLegacy, adminUnpublishLegacy } from '@/lib/actions/legacy';
import type { PlayerLegacy } from '@/lib/types/legacy';
import { STATUS_CONFIG } from '@/lib/types/legacy';

type Mode = 'list' | 'form' | 'preview';

export function AdminLegacyPanel({
  clubId,
  initialLegacies,
}: {
  clubId: string;
  initialLegacies: PlayerLegacy[];
}) {
  const [legacies, setLegacies] = useState<PlayerLegacy[]>(initialLegacies);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<PlayerLegacy | null>(null);
  const [previewing, setPreviewing] = useState<PlayerLegacy | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function upsertLocal(updated: PlayerLegacy) {
    setLegacies((prev) => {
      const idx = prev.findIndex((l) => l.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    setMode('list');
    setEditing(null);
  }

  function handlePublishToggle(legacy: PlayerLegacy) {
    setActionError(null);
    startTransition(async () => {
      const result = legacy.is_published
        ? await adminUnpublishLegacy(legacy.id, clubId)
        : await adminPublishLegacy(legacy.id, clubId);
      if (!result.success) { setActionError(result.error ?? 'Failed'); return; }
      setLegacies((prev) =>
        prev.map((l) => l.id === legacy.id ? { ...l, is_published: !l.is_published } : l)
      );
    });
  }

  const sectionHead: React.CSSProperties = {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 22, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={sectionHead}>Club Alumni</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {legacies.length} {legacies.length === 1 ? 'entry' : 'entries'} · {legacies.filter((l) => l.is_published).length} published
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {mode !== 'list' && (
            <Button variant="ghost" size="sm" onClick={() => { setMode('list'); setEditing(null); setPreviewing(null); }}>
              ← Back
            </Button>
          )}
          {mode === 'list' && (
            <Button size="sm" onClick={() => { setEditing(null); setMode('form'); }}>+ Add Legacy</Button>
          )}
        </div>
      </div>

      {actionError && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{actionError}</p>}

      {mode === 'form' && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ ...sectionHead, fontSize: 16, marginBottom: 20 }}>
            {editing ? `Editing: ${editing.display_name}` : 'New legacy entry'}
          </h2>
          <LegacyForm clubId={clubId} initial={editing} onSuccess={upsertLocal} />
        </div>
      )}

      {mode === 'preview' && previewing && (
        <div style={{ maxWidth: 520 }}>
          <LegacyCard legacy={previewing} />
        </div>
      )}

      {mode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {legacies.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '48px 0' }}>
              No legacy entries yet. Add the first one.
            </p>
          )}
          {legacies.map((legacy) => {
            const cfg = STATUS_CONFIG[legacy.status];
            return (
              <div key={legacy.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                padding: '14px 18px', border: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>{legacy.display_name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {cfg.emoji} {cfg.label} · {legacy.years_at_club}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: legacy.is_published ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)',
                    color: legacy.is_published ? '#6ee7b7' : 'rgba(255,255,255,0.3)',
                  }}>
                    {legacy.is_published ? 'Published' : 'Draft'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => { setPreviewing(legacy); setMode('preview'); }}>Preview</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(legacy); setMode('form'); }}>Edit</Button>
                  <Button
                    variant={legacy.is_published ? 'danger' : 'secondary'}
                    size="sm"
                    loading={isPending}
                    onClick={() => handlePublishToggle(legacy)}
                  >
                    {legacy.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
