'use client';

import { useState } from 'react';
import type { SafeguardingIncident, IncidentSeverity, IncidentStatus, IncidentCategory } from '@/lib/types/parent';
import { SEVERITY_LABELS, STATUS_LABELS, CATEGORY_LABELS } from '@/lib/types/parent';
import { card, cardTitle, muted, primaryBtn, input as inputStyle } from '@/components/play/ui';

interface Props {
  initialIncidents: SafeguardingIncident[];
}

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  low: 'rgba(255,255,255,0.5)',
  medium: '#EFC84A',
  high: '#ff9800',
  critical: '#ff5252',
};

export default function IncidentList({ initialIncidents }: Props) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<IncidentCategory>('welfare_concern');
  const [severity, setSeverity] = useState<IncidentSeverity>('low');
  const [description, setDescription] = useState('');

  const reload = async () => {
    const res = await fetch('/api/club/safeguarding');
    if (res.ok) {
      const data = await res.json();
      setIncidents(data.incidents ?? []);
    }
  };

  const handleReport = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/club/safeguarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, severity, description }),
      });
      if (res.ok) {
        setShowForm(false);
        setDescription('');
        setCategory('welfare_concern');
        setSeverity('low');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (incidentId: string, status: IncidentStatus) => {
    setUpdating(incidentId);
    try {
      await fetch('/api/club/safeguarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          status,
          ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
        }),
      });
      await reload();
    } finally {
      setUpdating(null);
    }
  };

  const open = incidents.filter(i => ['reported', 'under_review', 'escalated'].includes(i.status));
  const closed = incidents.filter(i => ['resolved', 'closed'].includes(i.status));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={cardTitle}>Safeguarding Incidents</h3>
        <button style={primaryBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Report Incident'}
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, marginTop: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={muted}>Category</label>
              <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value as IncidentCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={muted}>Severity</label>
              <select style={inputStyle} value={severity} onChange={e => setSeverity(e.target.value as IncidentSeverity)}>
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={muted}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: '4rem' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the concern in detail..."
              />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button style={primaryBtn} onClick={handleReport} disabled={saving || !description}>
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

      {/* Open incidents */}
      <div style={{ marginTop: '1rem' }}>
        <div style={{ ...muted, fontWeight: 600, marginBottom: '0.5rem' }}>Open ({open.length})</div>
        {open.length === 0 && <p style={muted}>No open incidents.</p>}
        {open.map(inc => (
          <IncidentCard
            key={inc.id}
            incident={inc}
            expanded={expanded === inc.id}
            onToggle={() => setExpanded(expanded === inc.id ? null : inc.id)}
            onStatusUpdate={handleStatusUpdate}
            isUpdating={updating === inc.id}
          />
        ))}
      </div>

      {/* Resolved */}
      {closed.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ ...muted, fontWeight: 600, marginBottom: '0.5rem' }}>Resolved ({closed.length})</div>
          {closed.map(inc => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              expanded={expanded === inc.id}
              onToggle={() => setExpanded(expanded === inc.id ? null : inc.id)}
              onStatusUpdate={handleStatusUpdate}
              isUpdating={updating === inc.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IncidentCard({
  incident, expanded, onToggle, onStatusUpdate, isUpdating,
}: {
  incident: SafeguardingIncident;
  expanded: boolean;
  onToggle: () => void;
  onStatusUpdate: (id: string, status: IncidentStatus) => void;
  isUpdating: boolean;
}) {
  return (
    <div style={{ ...card, marginBottom: '0.5rem' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: SEVERITY_COLORS[incident.severity],
            display: 'inline-block',
          }} />
          <div>
            <div style={{ fontWeight: 600, color: '#fff' }}>
              {CATEGORY_LABELS[incident.category]}
              {incident.is_confidential && <span style={{ color: '#ff5252', fontSize: '0.8rem', marginLeft: '0.5rem' }}>🔒 Confidential</span>}
            </div>
            <div style={muted}>
              {SEVERITY_LABELS[incident.severity]} · {STATUS_LABELS[incident.status]} · {new Date(incident.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.75rem' }}>{incident.description}</p>

          {incident.actions_taken && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={muted}>Actions taken: </span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{incident.actions_taken}</span>
            </div>
          )}
          {incident.outcome && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={muted}>Outcome: </span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{incident.outcome}</span>
            </div>
          )}

          {/* Status actions */}
          {!['resolved', 'closed'].includes(incident.status) && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              {incident.status === 'reported' && (
                <button
                  style={{ ...smallBtn, background: 'rgba(239,200,74,0.15)', color: '#EFC84A' }}
                  disabled={isUpdating}
                  onClick={() => onStatusUpdate(incident.id, 'under_review')}
                >Review</button>
              )}
              {['reported', 'under_review'].includes(incident.status) && (
                <button
                  style={{ ...smallBtn, background: 'rgba(255,82,82,0.15)', color: '#ff5252' }}
                  disabled={isUpdating}
                  onClick={() => onStatusUpdate(incident.id, 'escalated')}
                >Escalate</button>
              )}
              <button
                style={{ ...smallBtn, background: 'rgba(0,200,83,0.15)', color: '#00C853' }}
                disabled={isUpdating}
                onClick={() => onStatusUpdate(incident.id, 'resolved')}
              >Resolve</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 4, border: 'none',
  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
};
