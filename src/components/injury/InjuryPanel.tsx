'use client';

import { useState } from 'react';
import { markRecovered } from '@/lib/actions/injury';
import { BODY_PART_LABELS, SEVERITY_CONFIG, type InjuryLog } from '@/lib/types/injury';
import { InjuryForm } from './InjuryForm';

interface Props {
  clubId: string;
  active: InjuryLog[];
  past: InjuryLog[];
}

export function InjuryPanel({ clubId, active: initialActive, past: initialPast }: Props) {
  const [active, setActive] = useState(initialActive);
  const [past, setPast] = useState(initialPast);
  const [showForm, setShowForm] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const handleRecovered = async (id: string) => {
    setRecoveringId(id);
    const result = await markRecovered(id);
    setRecoveringId(null);
    if (result.success) {
      const log = active.find((l) => l.id === id);
      setActive((prev) => prev.filter((l) => l.id !== id));
      if (log) setPast((prev) => [{ ...log, is_active: false }, ...prev]);
    }
  };

  const handleNewInjury = () => {
    // Reload by reloading the page — simplest for a server-rendered page
    window.location.reload();
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '16px',
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      {/* Privacy notice */}
      <div style={{
        background: 'rgba(59,130,246,0.1)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>🔒</span>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
          <strong style={{ color: '#93c5fd' }}>Your privacy is protected.</strong> Your injury details are never shared with your captain or club admins. Admins only see anonymised statistics (e.g. &quot;3 players — Knee — Moderate&quot;), with no names attached.
        </p>
      </div>

      {/* Active injuries */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            Active injuries {active.length > 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({active.length})</span>}
          </h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                background: 'rgba(155,28,28,0.8)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              + Log injury
            </button>
          )}
        </div>

        {showForm && (
          <div style={{ ...cardStyle, marginBottom: '12px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#fff' }}>New injury log</h3>
            <InjuryForm clubId={clubId} onSuccess={handleNewInjury} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {active.length === 0 && !showForm ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '32px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>No active injuries — stay fit! 💪</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {active.map((log) => {
              const cfg = SEVERITY_CONFIG[log.severity];
              return (
                <div key={log.id} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>{cfg.emoji}</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{BODY_PART_LABELS[log.body_part]}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: cfg.color === 'text-yellow-500' ? '#eab308' : cfg.color === 'text-orange-500' ? '#f97316' : '#ef4444' }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        Injured {formatDate(log.injured_at)}
                        {log.expected_return && ` · Expected return ${formatDate(log.expected_return)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRecovered(log.id)}
                      disabled={recoveringId === log.id}
                      style={{
                        padding: '5px 12px', borderRadius: '6px',
                        border: '1px solid rgba(74,222,128,0.3)',
                        background: 'rgba(74,222,128,0.1)',
                        color: '#4ade80', fontSize: '12px', fontWeight: 600,
                        cursor: recoveringId === log.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {recoveringId === log.id ? '…' : '✓ Recovered'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past injuries */}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast((v) => !v)}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '10px',
            }}
          >
            {showPast ? '▾' : '▸'} Past injuries ({past.length})
          </button>
          {showPast && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {past.map((log) => {
                const cfg = SEVERITY_CONFIG[log.severity];
                return (
                  <div key={log.id} style={{ ...cardStyle, opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{cfg.emoji}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{BODY_PART_LABELS[log.body_part]}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                        {formatDate(log.injured_at)} → {formatDate(log.actual_return)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
