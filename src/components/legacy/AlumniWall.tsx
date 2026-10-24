'use client';

import { useState } from 'react';
import { LegacyCard } from './LegacyCard';
import type { PlayerLegacy, LegacyStatus } from '@/lib/types/legacy';

type FilterTab = 'all' | LegacyStatus;
const TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🏆' },
  { key: 'legend', label: 'Legends', emoji: '⭐' },
  { key: 'retired', label: 'Retired', emoji: '🏆' },
  { key: 'departed', label: 'Departed', emoji: '👋' },
  { key: 'active', label: 'Active', emoji: '🟢' },
];

export function AlumniWall({ legacies }: { legacies: PlayerLegacy[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const filtered = activeTab === 'all' ? legacies : legacies.filter((l) => l.status === activeTab);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const count = tab.key === 'all' ? legacies.length : legacies.filter((l) => l.status === tab.key).length;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 24, fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', border: active ? '1px solid rgba(155,28,28,0.6)' : '1px solid rgba(255,255,255,0.1)', background: active ? 'rgba(155,28,28,0.25)' : 'rgba(255,255,255,0.04)', color: active ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s', fontFamily: "'Inter', sans-serif" }}>
              <span aria-hidden>{tab.emoji}</span>
              {tab.label}
              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 12, background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)', color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}>{count}</span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>No entries in this category yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filtered.map((legacy) => <LegacyCard key={legacy.id} legacy={legacy} />)}
        </div>
      )}
    </div>
  );
}
